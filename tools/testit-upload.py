#!/usr/bin/env python3
"""Заливка тест-кейсов из docs/test-cases*.md в Test IT.

Скрипт разбирает Markdown с кейсами и создаёт в Test IT общие шаги, секции
и тест-кейсы. Повторный запуск ничего не дублирует: созданное запоминается
в файле состояния рядом со скриптом.

Что нужно:
  * Python 3.10+ (внешних зависимостей нет);
  * приватный API-токен Test IT (профиль → Настройки профиля → Безопасность),
    сохранённый в файл, по умолчанию ~/.testit-token:
        install -m 600 /dev/null ~/.testit-token
        printf '%s' 'ТОКЕН' > ~/.testit-token
  * адрес пространства Test IT в переменной TESTIT_URL или в ключе --url.

Команды:
  plan                 показать, что будет создано (ничего не отправляет)
  apply-base           создать общие шаги и секции
  apply [TC-ID ...]    создать кейсы: все или только указанные
  fix-names            убрать обратные кавычки Markdown из названий кейсов
  verify               перечитать созданное из Test IT и показать сводку

Примеры:
  TESTIT_URL=https://team-xxxx.testit.software tools/testit-upload.py plan
  tools/testit-upload.py apply-base
  tools/testit-upload.py apply TC-UI-01          # сначала один кейс на пробу
  tools/testit-upload.py apply                   # остальные
  tools/testit-upload.py --md docs/test-cases.md apply   # полный набор

Как кейсы ложатся на поля Test IT:
  название       «TC-INP-01. Ввод целого числа» (разметка не поддерживается)
  описание       строка «Требование: …» и примечания кейса
  приоритет      Высокий/Средний/Низкий → High/Medium/Low
  предусловия    ОП-1…ОП-3 вынесены в общие шаги и подключены к секциям,
                 у кейса остаётся только его собственная подготовка
  шаги           «Действие» и «Ожидаемый результат», разметка `код` → <strong>
  постусловия    один шаг: проверить состояние калькулятора после кейса
"""
import argparse
import html
import json
import os
import re
import sys
import urllib.error
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEFAULT_MD = os.path.join(ROOT, 'docs', 'test-cases-short.md')
STATE_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), '.testit-state.json')

DURATION = 180_000  # 3 минуты на кейс: поле обязательное, в самих кейсах его нет
PRIORITY = {'Высокий': 'High', 'Средний': 'Medium', 'Низкий': 'Low'}

# Общие шаги: то, что повторяется из кейса в кейс. Ключи используются ниже
# в SECTION_PRECONDITIONS и CASE_PRECONDITIONS.
SHARED = {
    'op1': {
        'name': 'ОП-1. Исходное состояние калькулятора',
        'steps': [('Открыть страницу калькулятора заново или перезагрузить её (`F5`)',
                   'На экране `0`, строка выражения пуста, индикатора `M` нет, журнал пуст',
                   'Память и журнал живут только до перезагрузки страницы, поэтому перезагрузка — '
                   'самый надёжный способ вернуться в исходное состояние между кейсами.')],
    },
    'op2': {
        'name': 'ОП-2. Окружение',
        'steps': [('Открыть калькулятор в актуальной версии Chrome, Firefox или Safari; '
                   'ширина окна — не меньше 760 px',
                   'Журнал виден справа от калькулятора', None)],
    },
    'op3': {
        'name': 'ОП-3. Стенд и версия сборки',
        'steps': [('Открыть стенд: https://calc.simdyanov.ru или локальный запуск '
                   '(`npm run dev` → http://localhost:5173, Docker → http://localhost:8080)',
                   'Калькулятор открыт; версия сборки видна в подвале страницы — её нужно записывать '
                   'в результаты прогона и баг-репорты', None)],
    },
    'prep': {
        'name': 'Подготовка: вычисление в журнале и число в памяти',
        'steps': [('Набрать `2`, нажать `+`, набрать `3`, нажать `=`', 'В журнале запись `2 + 3 =` → `5`', None),
                  ('Набрать `7`, нажать `MS`', 'На экране индикатор `M`', None)],
    },
    'err': {
        'name': 'Подготовка: состояние ошибки',
        'steps': [('Набрать `9`, нажать `+/−`, затем `²√x`',
                   'На экране «Недопустимый ввод», выражение `√(-9)`; доступны только цифры, `CE`, `C`, `⌫` и `=`',
                   None)],
    },
    'mem10': {
        'name': 'Подготовка: в память записано 10',
        'steps': [('Набрать `10`, нажать `MS`, затем `C`',
                   'На экране `0`, индикатор `M` виден, в памяти `10`', None)],
    },
}

# Предусловия секций. Предусловия секции применяются к её тестам и НЕ наследуются
# вложенными секциями, поэтому их указывают у каждой секции отдельно.
DEFAULT_SECTION_PRECONDITIONS = ['op1', 'op2', 'op3']
SECTION_PRECONDITIONS = {
    # В TC-UI-01 страница калькулятора ещё не открыта, поэтому ОП-1 здесь неприменим
    'Интерфейс': ['op2', 'op3'],
}

# Предусловия кейсов, которые собираются из общих шагов (ключи SHARED)
# и собственных шагов (текст как в Markdown)
CASE_PRECONDITIONS = {
    'TC-INP-14': ['prep'],
    'TC-MEM-03': ['mem10'],
    'TC-MEM-04': ['mem10'],
    'TC-MEM-08': ['mem10'],
    'TC-ERR-05': ['err'],
    'TC-ERR-06': ['err'],
    'TC-ERR-08': ['err', 'Фокус на странице калькулятора'],
    'TC-ERR-09': ['prep', 'err'],
    'TC-HIS-07': ['prep'],
}

# Вводные абзацы разделов, которые относятся ко всем кейсам раздела
SECTION_EXTRA_PRECONDITIONS = {
    'Клавиатура': ['Фокус — на странице калькулятора, раскладка клавиатуры английская (для `r`, `q`, `@`)'],
}


# --------------------------------------------------------------- обращения к API

class Api:
    def __init__(self, url, token_file):
        self.base = url.rstrip('/')
        with open(os.path.expanduser(token_file), encoding='utf-8') as f:
            self.token = f.read().strip()
        if not self.token:
            raise SystemExit(f'Файл {token_file} пуст — в нём должен быть приватный токен Test IT')

    def __call__(self, method, path, body=None):
        data = json.dumps(body, ensure_ascii=False).encode() if body is not None else None
        req = urllib.request.Request(f'{self.base}{path}', data=data, method=method)
        req.add_header('Authorization', f'PrivateToken {self.token}')
        if data:
            req.add_header('Content-Type', 'application/json')
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                raw = r.read()
                return json.loads(raw) if raw else None
        except urllib.error.HTTPError as e:
            raise SystemExit(f'{method} {path} → HTTP {e.code}: {e.read().decode()[:800]}')
        except urllib.error.URLError as e:
            raise SystemExit(f'{method} {path} → нет связи с {self.base}: {e.reason}')


def load_state():
    if os.path.exists(STATE_FILE):
        with open(STATE_FILE, encoding='utf-8') as f:
            return json.load(f)
    return {}


def save_state(state):
    with open(STATE_FILE, 'w', encoding='utf-8') as f:
        json.dump(state, f, ensure_ascii=False, indent=2)


def resolve_project(api, name, state):
    """Находит проект по названию и запоминает его вместе с корневой секцией."""
    if state.get('url') == api.base and state.get('project', {}).get('name') == name:
        return state['project']
    projects = [p for p in api('GET', '/api/v2/projects') if p['name'] == name and not p['isDeleted']]
    if len(projects) != 1:
        raise SystemExit(f'Проект «{name}»: найдено {len(projects)} штук, ожидался один')
    sections = api('GET', f'/api/v2/projects/{projects[0]["id"]}/sections')
    root = next(s for s in sections if not s['parentId'])
    project = {'id': projects[0]['id'], 'name': name, 'rootSectionId': root['id']}
    state.update({'url': api.base, 'project': project})
    save_state(state)
    return project


# --------------------------------------------------------------- текст и шаги

def p(text):
    """Строка Markdown → абзац HTML: `код` становится жирным."""
    parts = html.escape(text).split('`')
    return '<p>' + ''.join(f'<strong>{x}</strong>' if i % 2 else x for i, x in enumerate(parts)) + '</p>'


def step(action, expected='', comments=None):
    return {'action': p(action), 'expected': p(expected) if expected else '',
            'testData': '', 'comments': comments}


def shared_ref(shared_step_id):
    """Ссылка на общий шаг вместо обычного шага."""
    return {'action': None, 'expected': None, 'testData': None, 'comments': None,
            'workItemId': shared_step_id}


# --------------------------------------------------------------- разбор Markdown

def parse_cases(path):
    cases, case, section, in_pre = [], None, None, False
    with open(path, encoding='utf-8') as f:
        for line in f.read().split('\n'):
            if m := re.match(r'^## \d+\. (.+)$', line):
                section, case, in_pre = m.group(1), None, False
            elif m := re.match(r'^### (TC-[A-Z]+-\d+)\. (.+)$', line):
                case = {'id': m.group(1), 'title': m.group(2), 'section': section,
                        'pre': [], 'steps': [], 'notes': [], 'post': ''}
                cases.append(case)
                in_pre = False
            elif case is None:
                continue
            elif line.startswith('**Приоритет:**'):
                m = re.match(r'^\*\*Приоритет:\*\* (\S+) · \*\*Требование:\*\* (.+)$', line)
                case['priority'] = PRIORITY[m.group(1).capitalize()]
                case['req'] = m.group(2)
            elif line.startswith('**Предусловия:**'):
                case['pre'].append(line.removeprefix('**Предусловия:**').strip())
                in_pre = True
            elif in_pre and re.match(r'^\d+\. ', line):
                case['pre'].append(re.sub(r'^\d+\. ', '', line))
            elif m := re.match(r'^\| (\d+) \| (.+) \| (.+) \|$', line):
                case['steps'].append((m.group(2).strip(), m.group(3).strip()))
                in_pre = False
            elif line.startswith('**Примечание:**'):
                case['notes'].append(line.removeprefix('**Примечание:**').strip())
                in_pre = False
            elif line.startswith('**Постусловия:**'):
                case['post'] = line.removeprefix('**Постусловия:**').strip()
                in_pre = False
            elif not line.strip():
                in_pre = False
    for c in cases:
        if not (c.get('priority') and c['steps'] and c['pre'] and c['post']):
            raise SystemExit(f'{c["id"]}: кейс разобран не полностью, проверьте разметку в {path}')
    if not cases:
        raise SystemExit(f'В {path} не найдено ни одного кейса')
    return cases


def sections_of(cases):
    """Секции в порядке появления в файле."""
    return list(dict.fromkeys(c['section'] for c in cases))


# --------------------------------------------------------------- формирование тел запросов

def shared_payload(key, project):
    s = SHARED[key]
    return {'projectId': project['id'], 'sectionId': project['rootSectionId'], 'name': s['name'],
            'entityTypeName': 'SharedSteps', 'duration': 0, 'state': 'Ready', 'priority': 'Medium',
            'steps': [step(*args) for args in s['steps']],
            'preconditionSteps': [], 'postconditionSteps': [], 'tags': [], 'links': []}


def section_payload(name, project, shared_ids):
    keys = SECTION_PRECONDITIONS.get(name, DEFAULT_SECTION_PRECONDITIONS)
    steps = [shared_ref(shared_ids[k]) for k in keys]
    steps += [step(t) for t in SECTION_EXTRA_PRECONDITIONS.get(name, [])]
    return {'name': name, 'projectId': project['id'], 'parentId': project['rootSectionId'],
            'attachments': [], 'postconditionSteps': [], 'preconditionSteps': steps}


def capitalize(text):
    return text[:1].upper() + text[1:]


def own_step(text):
    """«Действие — ожидаемый результат» из строки предусловия Markdown."""
    action, _, expected = text.partition(' — ')
    return step(capitalize(action.strip().rstrip('.')),
                capitalize(expected.strip().rstrip('.')) if expected else '')


def case_preconditions(case, shared_ids):
    if entries := CASE_PRECONDITIONS.get(case['id']):
        return [shared_ref(shared_ids[e]) if e in SHARED else own_step(e) for e in entries]
    # Ссылки на ОП-* убираем: эти предусловия подключены к секции
    head = re.sub(r'^ОП-\d(?:\s*,\s*ОП-\d)*', '', case['pre'][0])
    head = re.sub(r'^\s*[.,;:]\s*', '', head)
    head = re.sub(r'^затем\s*:?\s*', '', head).strip()
    # Перечисление через «;» разбиваем на отдельные шаги
    texts = [t for t in head.split('; ')] + case['pre'][1:]
    return [own_step(t) for t in texts if t.strip()]


def case_payload(case, project, shared_ids, section_ids):
    notes = ''.join(p(f'Примечание: {n}') for n in case['notes'])
    post = case['post'][:1].upper() + case['post'][1:]
    return {
        'projectId': project['id'],
        'sectionId': section_ids[case['section']],
        # В названии разметка не поддерживается, обратные кавычки Markdown убираем
        'name': f'{case["id"]}. {case["title"]}'.replace('`', ''),
        'entityTypeName': 'TestCases',
        'description': p(f'Требование: {case["req"]}') + notes,
        'duration': DURATION,
        'state': 'Ready',
        'priority': case['priority'],
        'preconditionSteps': case_preconditions(case, shared_ids),
        'steps': [step(a, e) for a, e in case['steps']],
        'postconditionSteps': [step('Проверить состояние калькулятора после кейса', post)],
        'tags': [{'name': 'calc-js'}],
        'links': [],
    }


# --------------------------------------------------------------- команды

def cmd_plan(cases, args, state, api=None):
    print(f'Файл: {args.md}')
    print(f'Общие шаги ({len(SHARED)}):')
    for key, s in SHARED.items():
        print(f'  {key}: {s["name"]} — шагов {len(s["steps"])}')
    print('Секции:')
    for name in sections_of(cases):
        keys = SECTION_PRECONDITIONS.get(name, DEFAULT_SECTION_PRECONDITIONS)
        n = sum(1 for c in cases if c['section'] == name)
        print(f'  {name}: предусловия {keys}, кейсов {n}')
    print(f'Кейсы ({len(cases)}):')
    for c in cases:
        pre = CASE_PRECONDITIONS.get(c['id']) or len(case_preconditions(c, {}))
        print(f'  {c["id"]} | {c["section"]} | {c["priority"]} | шагов {len(c["steps"])} | предусловий {pre}')
    done = state.get('cases', {})
    if done:
        print(f'Уже создано ранее: {len(done)} кейсов — повторно созданы не будут')


def cmd_apply_base(cases, args, state, api):
    project = resolve_project(api, args.project, state)
    shared_ids = dict(state.get('shared', {}))
    for key in SHARED:
        if key in shared_ids:
            print(f'общий шаг {key}: уже создан')
            continue
        r = api('POST', '/api/v2/workItems', shared_payload(key, project))
        shared_ids[key] = r['id']
        print(f'общий шаг {key}: создан globalId {r["globalId"]} — {r["name"]}')
        state['shared'] = shared_ids
        save_state(state)
    section_ids = dict(state.get('sections', {}))
    for name in sections_of(cases):
        if name in section_ids:
            print(f'секция {name}: уже создана')
            continue
        r = api('POST', '/api/v2/sections', section_payload(name, project, shared_ids))
        section_ids[name] = r['id']
        print(f'секция {name}: создана — предусловий {len(r.get("preconditionSteps") or [])}')
        state['sections'] = section_ids
        save_state(state)


def cmd_apply(cases, args, state, api):
    project = resolve_project(api, args.project, state)
    if not state.get('shared') or not state.get('sections'):
        raise SystemExit('Сначала выполните apply-base: нужны общие шаги и секции')
    done = state.setdefault('cases', {})
    for case in cases:
        if args.ids and case['id'] not in args.ids:
            continue
        if case['id'] in done:
            print(f'{case["id"]}: уже создан (globalId {done[case["id"]]["globalId"]})')
            continue
        body = case_payload(case, project, state['shared'], state['sections'])
        r = api('POST', '/api/v2/workItems', body)
        done[case['id']] = {'id': r['id'], 'globalId': r['globalId']}
        save_state(state)
        print(f'{case["id"]}: создан globalId {r["globalId"]} — {r["name"]}')


def cmd_fix_names(cases, args, state, api):
    """Убирает обратные кавычки из названий созданных кейсов, не трогая содержимое."""
    keep = ('action', 'expected', 'testData', 'comments', 'workItemId')
    for tc, info in state.get('cases', {}).items():
        w = api('GET', f'/api/v2/workItems/{info["id"]}')
        clean = w['name'].replace('`', '')
        if clean == w['name']:
            continue
        body = {'id': w['id'], 'sectionId': w['sectionId'], 'name': clean,
                'description': w.get('description'), 'duration': w['duration'],
                'state': w['state'], 'priority': w['priority'],
                'attributes': w.get('attributes') or {},
                'tags': [{'name': t['name']} for t in w.get('tags') or []],
                'links': [], 'attachments': [], 'iterations': [], 'autoTests': []}
        for block in ('preconditionSteps', 'steps', 'postconditionSteps'):
            body[block] = [{k: st.get(k) for k in keep} for st in w.get(block) or []]
        api('PUT', '/api/v2/workItems', body)
        print(f'{tc}: название исправлено → {clean}')


def cmd_verify(cases, args, state, api):
    for name, sid in state.get('sections', {}).items():
        sec = api('GET', f'/api/v2/sections/{sid}')
        pre = [(st.get('workItem') or {}).get('name') or 'свой шаг' for st in sec.get('preconditionSteps') or []]
        print(f'секция {sec["name"]}: предусловия {pre}')
    for tc, info in state.get('cases', {}).items():
        w = api('GET', f'/api/v2/workItems/{info["id"]}')
        pre = [(st.get('workItem') or {}).get('name') or 'свой шаг' for st in w.get('preconditionSteps') or []]
        print(f'{tc}: {w["name"]} | {w["priority"]} | шагов {len(w.get("steps") or [])} | '
              f'предусловия {pre} | постусловий {len(w.get("postconditionSteps") or [])}')


COMMANDS = {'plan': cmd_plan, 'apply-base': cmd_apply_base, 'apply': cmd_apply,
            'fix-names': cmd_fix_names, 'verify': cmd_verify}


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('command', choices=COMMANDS)
    parser.add_argument('ids', nargs='*', help='идентификаторы кейсов, например TC-UI-01')
    parser.add_argument('--md', default=DEFAULT_MD, help=f'файл с кейсами (по умолчанию {DEFAULT_MD})')
    parser.add_argument('--url', default=os.environ.get('TESTIT_URL'),
                        help='адрес Test IT, по умолчанию переменная окружения TESTIT_URL')
    parser.add_argument('--project', default=os.environ.get('TESTIT_PROJECT', 'Калькулятор'),
                        help='название проекта в Test IT')
    parser.add_argument('--token-file', default=os.environ.get('TESTIT_TOKEN_FILE', '~/.testit-token'),
                        help='файл с приватным API-токеном')
    args = parser.parse_args()

    cases = parse_cases(args.md)
    state = load_state()
    if args.command == 'plan':
        return cmd_plan(cases, args, state)
    if not args.url:
        raise SystemExit('Укажите адрес Test IT: --url или переменная окружения TESTIT_URL')
    api = Api(args.url, args.token_file)
    if state.get('url') and state['url'] != api.base.rstrip('/'):
        raise SystemExit(f'В {STATE_FILE} записан другой адрес: {state["url"]}. '
                         'Удалите файл состояния, если заливаете в другой инстанс')
    COMMANDS[args.command](cases, args, state, api)


if __name__ == '__main__':
    sys.exit(main())

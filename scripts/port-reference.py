"""원본 DC 템플릿을 정적 React TSX로 변환합니다. 브라우저에서 템플릿/eval/support.js를 실행하지 않습니다."""
from pathlib import Path
from html.parser import HTMLParser
import re, json, hashlib, argparse

script_dir = Path(__file__).resolve().parent
if script_dir.name == 'scripts':
    project = script_dir.parent
    default_source = project.parent / 'reference'
else:
    project = script_dir / 'buildcheck'
    default_source = script_dir / 'handoff/design_handoff_mr_assembly_training/reference'
args = argparse.ArgumentParser(description=__doc__)
args.add_argument('--source', type=Path, default=default_source)
args.add_argument('--output', type=Path, default=project / 'src/features/reference-pages/generated')
args.add_argument('--drawing-flow', action='store_true', help='Port the Demo 7 drawing flow handoff')
options = args.parse_args()
source, target = options.source, options.output
target.mkdir(parents=True, exist_ok=True)
PAGES = {'Drawing Upload': 'DrawingUploadReference', 'Training Menu': 'TrainingMenuReference', 'Stool Training': 'StoolTrainingReference', 'Complex Explode': 'ComplexExplodeReference', 'HUD Prototype': 'HudPrototypeReference', 'Design Guide': 'DesignGuideReference'}
VOID = {'area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr'}
ROUTES = {'Training Menu.dc.html':'/training/cards', 'Drawing Upload.dc.html':'/training/upload', 'Stool Training.dc.html':'/training/stool', 'HUD Prototype.dc.html':'/training/hud', 'Demo 1.dc.html':'/training', 'Complex Explode.dc.html':'/training/complex', 'Design Guide.dc.html':'/design-guide'}
if options.drawing_flow:
    from port_drawing_flow import adapt_drawing, drawing_template, install_assets
    PAGES = {'demo7d/Flow Main': 'DrawingFlowMain', 'demo7d/Flow Steps': 'DrawingFlowSteps'}
    ROUTES['Demo 7 전체.dc.html'] = '/training'
    install_assets(source, project / 'public/vendor/drawing-flow')

class Parser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True); self.root = ['root',{},[]]; self.stack=[self.root]
    def handle_starttag(self, tag, attrs):
        n=[tag,dict(attrs),[]]; self.stack[-1][2].append(n)
        if tag not in VOID: self.stack.append(n)
    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag,attrs)
        if tag not in VOID: self.stack.pop()
    def handle_endtag(self, tag):
        for i in range(len(self.stack)-1,0,-1):
            if self.stack[i][0]==tag: self.stack=self.stack[:i]; break
    def handle_data(self,data): self.stack[-1][2].append(data)

def dump(x): return json.dumps(x, ensure_ascii=False)
def expr(x,aliases):
    x=x.strip()
    if x in ('true','false','null','undefined'): return x
    return x if x.split('.')[0] in aliases else 'v.'+x
def value(x, aliases):
    if x is None: return 'true'
    m=re.fullmatch(r'{{\s*([^{}]*)\s*}}',x)
    if m: return expr(m[1],aliases)
    bits=re.split(r'({{.*?}})',x)
    return ' + '.join('String('+expr(b[2:-2],aliases)+')' if b.startswith('{{') else dump(b) for b in bits if b) or '""'
def camel(k): return re.sub(r'-([a-z])',lambda m:m[1].upper(),k)
def css_object(css,aliases):
    result=[]
    for decl in css.split(';'):
        if ':' not in decl: continue
        k,val=decl.split(':',1); k=k.strip();val=val.strip()
        if not k: continue
        result.append(dump(k if k.startswith('--') else camel(k))+':'+value(val,aliases))
    return '{'+','.join(result)+'}'
ATTRS={'viewbox':'viewBox','for':'htmlFor','tabindex':'tabIndex','readonly':'readOnly','autofocus':'autoFocus','oninput':'onChange','basefrequency':'baseFrequency','numoctaves':'numOctaves','stitchtiles':'stitchTiles','contenteditable':'contentEditable','spellcheck':'spellCheck','inputmode':'inputMode'}
TAGS={'feturbulence':'feTurbulence','fecolormatrix':'feColorMatrix'}
EVENTS={x.lower():x for x in ['onClick','onDoubleClick','onChange','onBlur','onKeyDown','onContextMenu','onPointerDown','onPointerMove','onPointerUp','onPointerLeave','onMouseDown','onMouseEnter','onMouseLeave','onWheel','onDragStart','onDragEnd','onDragOver','onDragLeave','onDrop']}
def render(node, aliases=(), key=None):
    if isinstance(node,str):
        if not node.strip(): return ''
        return ''.join('{'+expr(bit[2:-2],aliases)+'}' if bit.startswith('{{') else '{'+dump(bit)+'}' for bit in re.split(r'({{.*?}})',node) if bit)
    tag,a,children=node
    # 기본 예제 도면은 배포하지 않습니다. 원본을 재변환해도 버튼을 되살리지 않습니다.
    if re.fullmatch(r'{{\s*useSample\s*}}', a.get('onclick', '')): return ''
    if tag in ('helmet','script','style','link','meta'): return ''
    if tag=='sc-if': return '{('+value(a['value'],aliases)+') ? <>'+''.join(render(c,aliases)for c in children)+'</> : null}'
    if tag=='sc-for':
        name=a['as']; return '{('+value(a['list'],aliases)+' ?? []).map(('+name+', index) => <React.Fragment key={index}>'+''.join(render(c,(*aliases,name))for c in children)+'</React.Fragment>)}'
    if tag=='root':return ''.join(render(c,aliases)for c in children)
    props=['as='+dump(TAGS.get(tag,tag))]
    for k,x in a.items():
        if k.startswith('hint-') or (options.drawing_flow and k == 'style-focus'):continue
        if k=='style':props.append('$style={'+css_object(x,aliases)+'}');continue
        if k=='style-hover':props.append('$hover={'+value(x,aliases)+'}');continue
        if k=='href' and x:
            for old,new in ROUTES.items():x=x.replace(old,new)
        if k=='src' and x and x.startswith('uploads/'):x='/reference-assets/'+x[8:]
        name=ATTRS.get(k,EVENTS.get(k,k if k.startswith(('data-','aria-')) else camel(k)))
        if options.drawing_flow and k in ('multiple', 'draggable', 'disabled', 'checked', 'selected') and x is not None and not x.startswith('{{'):
            props.append(name+'={true}')
            continue
        props.append(name+'={'+value(x,aliases)+'}')
    if options.drawing_flow and tag in ('div', 'span') and 'onclick' in a and 'ondragstart' not in a:
        handler = value(a['onclick'],aliases)
        props.extend(['role="button"', 'tabIndex={0}'])
        if 'onkeydown' not in a:
            props.append('onKeyDown={event => { if (event.target === event.currentTarget && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); '+handler+'?.(event); } }}')
    if options.drawing_flow and 'contenteditable' in a:
        props.append('suppressContentEditableWarning={true}')
    if tag in VOID:return '<SourceNode '+' '.join(props)+' />'
    return '<SourceNode '+' '.join(props)+'>'+''.join(render(c,aliases)for c in children)+'</SourceNode>'

def adapt(logic,name):
    logic=logic.replace('class Component extends DCLogic','export default class '+name+' extends PortedLogic')
    # support.js의 __setLogicState는 즉시 병합 후 React를 갱신합니다. 같은 상태 계약을 유지합니다.
    logic=re.sub(r'(?m)^  state\s*=', '  referenceState =', logic)
    logic=logic.replace('this.state', 'this.referenceState').replace('me.state', 'me.referenceState').replace('this.setState', 'this.updateReferenceState')
    logic=logic.replace('componentDidMount()', 'mountReference()').replace('componentWillUnmount()', 'unmountReference()')
    for api,method in [('requestAnimationFrame','scheduleFrame'),('setTimeout','delay'),('setInterval','repeat')]:
        logic=re.sub(r'(?<![\w.])'+api+r'\(', 'this.'+method+'(',logic)
    logic=logic.replace('window.addEventListener(', 'this.listen(').replace('window.removeEventListener(', 'this.unlisten(')
    logic=logic.replace('new T.WebGLRenderer(', 'this.createRenderer(T, ')
    logic=logic.replace('new d.T.WebGLRenderer(', 'this.createRenderer(d.T, ')
    logic=logic.replace('new URLSearchParams(location.search)', 'this.referenceParams()')
    logic=logic.replace('window.__tmInst || this','this').replace('window.__tmInst = this;', '').replace('window.__tmHolo = loop;', 'this.holoLoop = loop;')
    logic=logic.replace('window.__hud = this;', '').replace('window.__HUD_DEMO','false')
    logic=re.sub(r"if \(this.referenceParams\(\).get\('demo'\) \|\| false\) this.delay\(\(\) => this.runDemo\(\), 1800\);",'',logic)
    logic=logic.replace("import('https://cdn.jsdelivr.net/npm/pdfjs-dist@4.4.168/build/pdf.min.mjs')", "import('pdfjs-dist')")
    logic=logic.replace("'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.4.168/build/pdf.worker.min.mjs'", "'/vendor/pdf.worker.min.mjs'")
    logic=logic.replace("Promise.all([import('https://esm.sh/three@0.149.0'), import('https://esm.sh/three@0.149.0/examples/jsm/loaders/GLTFLoader.js')])", "Promise.all([Promise.resolve(window.THREE), import(/* webpackIgnore: true */ /* turbopackIgnore: true */ '/vendor/GLTFLoader-r149.js')])")
    logic=logic.replace("'uploads/hammer_optimized_14MB/hammer_optimized_14MB.glb'", "'/models/hammer.glb'")
    for old,new in ROUTES.items():logic=logic.replace(old,new)
    if name=='DrawingUploadReference':
        logic=re.sub(r'(?m)^  async useSample\(\) \{[^\n]*\}\n?', '', logic)
        logic=re.sub(r'(?m)^[ \t]*useSample:[ \t]*\(\)[ \t]*=>[ \t]*this\.useSample\(\),?[ \t]*\n?', '', logic)
        if 'useSample' in logic: raise ValueError('예제 도면 로더가 남아 있습니다. 변환 규칙을 확인하세요.')
        logic=logic.replace("location.href = '/training/cards?new=1';", "saveGeneratedTraining(data, this.CARDS); location.href = '/training/cards?new=1';")
    # 시연용 전역 인스턴스는 React 밖으로 공개하지 않습니다.
    logic=logic.replace("if (!this._started) this.delay(() => this.startAll(), 0);", '')
    return logic

manifest=[]
for file,name in PAGES.items():
    raw=(source/(file+'.dc.html')).read_text(encoding='utf-8')
    template=raw.split('<x-dc>',1)[1].split('</x-dc>',1)[0]
    if options.drawing_flow:
        template=drawing_template(template,name)
    parser=Parser();parser.feed(template)
    logic=re.search(r'<script[^>]*data-dc-script[^>]*>(.*?)</script>',raw,re.S).group(1).strip()
    logic=adapt(logic,name)
    if options.drawing_flow:
        logic=adapt_drawing(logic,name)
    css='\n'.join(re.findall(r'<style>(.*?)</style>',template,re.S))
    # 전역 html/body 규칙은 페이지 루트로 격리합니다. 원본 keyframes와 폰트만 전역으로 둡니다.
    css=re.sub(r'html\s*,\s*body\s*\{[^}]*\}', '',css)
    css=re.sub(r'a\s*(:hover)?\s*\{[^}]*\}', '',css)
    css=css.replace('`','\\`').replace('${','\\${')
    css=css.replace("'JetBrains Mono',monospace", "var(--font-mono),'JetBrains Mono',monospace")
    jsx=render(parser.root)
    pos=logic.rfind('}')
    logic=logic[:pos]+'\n  render() { const v = this.renderVals(); return <>'+('' if options.drawing_flow else '<ReferenceCss />')+jsx+'</>; }\n'+logic[pos:]
    imports="import { saveGeneratedTraining } from '../referenceStorage';\n" if name=='DrawingUploadReference' else ''
    if options.drawing_flow:
        imports="import { FlowLogic, escapeFlowHtml, localPlanSuggestion } from '@/features/drawing-flow/flowLogic';\nimport { cloneFlowProject, prepareFlowProject } from '@/features/drawing-flow/flowProject';\n"
        imports+="import { FLOW_FASTENING_TOOLS, drawingToolKey, findFlowFasteningTool } from '@/features/drawing-flow/flowToolCatalog';\n"
        if name=='DrawingFlowSteps':
            imports+="import { createStepWireGeometry } from '@/features/drawing-flow/stepWireGeometry';\n"
        runtime="import { SourceNode } from '../referenceRuntime';\n"
    else:
        runtime="import { createGlobalStyle } from 'styled-components';\nimport { PortedLogic, SourceNode } from '../referenceRuntime';\n"
    content="/* eslint-disable -- 원본의 비정형 장면/상태 로직을 보존한 생성 파일. */\n// @ts-nocheck\n// 수정은 port-reference.py 변환기에서 합니다. 원본 파일 해시는 manifest.json에 있습니다.\n'use client';\nimport React from 'react';\n"+runtime+imports+('' if options.drawing_flow else 'const ReferenceCss = createGlobalStyle`'+css+'`;\n')+logic+'\n'
    # inline mono 폰트도 next/font의 동일 폰트를 사용합니다.
    content=content.replace("'JetBrains Mono',monospace", "var(--font-mono),'JetBrains Mono',monospace")
    destination = target / (name + '.tsx')
    if not destination.exists() or destination.read_text(encoding='utf-8') != content:
        destination.write_text(content, encoding='utf-8')
    manifest.append({'reference':file+'.dc.html','sha256':hashlib.sha256(raw.encode()).hexdigest(),'component':name,'bytes':len(content.encode())})
manifest_content = json.dumps(manifest, ensure_ascii=False, indent=2)
manifest_path = target / ('drawing-flow-manifest.json' if options.drawing_flow else 'manifest.json')
if not manifest_path.exists() or manifest_path.read_text(encoding='utf-8') != manifest_content:
    manifest_path.write_text(manifest_content, encoding='utf-8')
print(manifest)

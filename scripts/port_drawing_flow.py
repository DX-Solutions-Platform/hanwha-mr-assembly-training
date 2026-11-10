"""Demo 7 changes at the boundary between the handoff and the application."""
from pathlib import Path
import json
import re

ASSETS = ('flow-engine', 'flow-train', 'flow-data', 'shaper-hq', 'shaper-full',
          'shaper-tex', 'part-library7', 'drawing-model6')


def chain_icon(size, vertical=False):
    paths = ('<path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1"></path>'
             '<path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"></path>')
    if vertical:
        paths = '<g transform="rotate(-45 12 12)">' + paths + '</g>'
    orientation = 'vertical' if vertical else 'diagonal'
    viewbox = '-1 -1 26 26' if vertical else '0 0 24 24'
    return (f'<svg data-link-icon="{orientation}" aria-hidden="true" width="{size}" height="{size}" viewBox="{viewbox}" '
            'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" style="display:block;flex:none">'
            + paths + '</svg>')


def between(text, first, last, replacement):
    start = text.index(first)
    end = text.index(last, start + len(first))
    return text[:start] + replacement + text[end:]


def install_assets(source: Path, target: Path):
    target.mkdir(parents=True, exist_ok=True)
    for name in ASSETS:
        path = source / (name + '.js')
        text = path.read_text(encoding='utf-8')
        if name == 'flow-engine':
            text = text.replace('  function geoOf(g, dense) {', '''  function geoOf(g, dense) {
    if (g.t === 'mesh') {
      const geometry = new T.BufferGeometry();
      geometry.setAttribute('position', new T.BufferAttribute(g.positions, 3));
      geometry.setIndex(new T.BufferAttribute(g.indices, 1));
      if (g.normals) geometry.setAttribute('normal', new T.BufferAttribute(g.normals, 3));
      else geometry.computeVertexNormals();
      return geometry;
    }''')
            text = text.replace('this.tick(dt);', 'if (!this.suspended) this.tick(dt);')
            text = text.replace('metalness: part.metal ? 0.6 : 0.04', "metalness: e.t === 'mesh' ? 0.14 : part.metal ? 0.6 : 0.04")
            text = text.replace('makeBuild(pr) {', 'makeBuild(pr, makeWire) {')
            text = text.replace('this.add(this.wire(part))', 'this.add(makeWire ? makeWire(g) : this.wire(part))', 1)
        if name in ('flow-engine', 'flow-train'):
            text = text.replace('  const T = ', '''  const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[char]);
  const T = ''', 1)
            for value in ('pr.parts[k].ko', 's.ko', 's.no', 'st.nmSrc', 'st.nm', 'st.toolKo'):
                text = text.replace('${' + value + '}', '${escape(' + value + ')}')
        if name == 'flow-train':
            text = text.replace("st.part === 'all' ? [] : s.idx.map", "st.part === 'all' ? [] : (st.pcs || s.idx).map")
        (target / path.name).write_text(text, encoding='utf-8')


def step_viewport_template(template):
    status_start = '<div style="position:absolute;left:50%;top:20px;transform:translateX(-50%);z-index:6;'
    status_end = '\n<div style="position:absolute;left:20px;bottom:56px;'
    status_from = template.index(status_start)
    status_to = template.index(status_end, status_from)
    status = template[status_from:status_to].strip().replace(
        status_start, '<div data-step-validation="" style="flex:none;', 1,
    )
    template = template[:status_from] + template[status_to:]
    title_start = '      <div style="position:absolute;left:24px;top:20px;display:flex;flex-direction:column;gap:6px;pointer-events:none">'
    legend_start = '      <div style="position:absolute;left:24px;bottom:22px;'
    title_from = template.index(title_start)
    title_to = template.index(legend_start, title_from)
    header = template[title_from:title_to].replace(
        title_start, '<div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:6px">', 1,
    )
    header = header.replace(
        '<span style="font-size:22px;font-weight:700;color:#ffffff">{{ curKo }}</span>',
        '<span data-step-name="" title="{{ curKo }}" style="display:block;font-size:22px;font-weight:700;color:#ffffff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">{{ curKo }}</span>',
        1,
    )
    header = header.replace(
        '<div style="position:absolute;right:20px;top:20px;display:flex;gap:2px;',
        '<sc-if value="{{ notTm }}">' + status + '</sc-if>\n<div data-step-view-controls="" style="flex:none;display:flex;gap:2px;white-space:nowrap;',
        1,
    )
    template = template[:title_from] + template[title_to:]
    template = template.replace(
        'style="position:relative;min-width:0;min-height:0;background:radial-gradient(ellipse at 50% 58%,',
        'style="display:grid;grid-template-rows:74px minmax(0,1fr);min-width:0;min-height:0;background:radial-gradient(ellipse at 50% 58%,',
        1,
    )
    viewport_start = '      <div onClick="{{ listTog }}"'
    template = template.replace(
        viewport_start,
        '<div data-step-toolbar="" style="display:flex;min-width:0;align-items:center;gap:16px;padding:0 18px;background:#11171b;border-bottom:1px solid #27313a">'
        + header + '</div>\n<div data-step-viewport="" data-sequence-review="{{ sequenceReview }}" style="position:relative;min-width:0;min-height:0;overflow:hidden">\n' + viewport_start,
        1,
    )
    right_sidebar = '    </div>\n\n    <div style="display:flex;flex-direction:column;min-height:0;background:#0d1114;border-left:1px solid #1a2026">'
    return template.replace(right_sidebar, '      </div>\n' + right_sidebar, 1)


def integrated_tool_template(template):
    sidebar = '    <div style="display:flex;flex-direction:column;min-height:0;background:#0d1114;border-left:1px solid #1a2026">'
    template = template.replace(sidebar + '\n      <sc-if value="{{ notTm }}" hint-placeholder-val="{{ true }}">', sidebar, 1)
    chat = '<div style="display:flex;justify-content:center;padding:16px 20px 18px;border-top:1px solid #1a2026">'
    template = template.replace(chat, '<sc-if value="{{ showStepChat }}">' + chat, 1)
    template = template.replace('<sc-if value="{{ isTm }}" hint-placeholder-val="{{ false }}">\n      <div style="flex:1;min-height:0;overflow-y:auto;',
                                '<sc-if value="{{ toolPanel }}"><div data-tool-library="" style="flex:1;min-height:0;overflow-y:auto;', 1)
    template = template.replace('<sc-for list="{{ looks }}"', '''<sc-if value="{{ canReviewTools }}"><button type="button" onClick="{{ openToolReview }}" style="padding:7px 10px;border:0;border-radius:6px;background:{{ toolReviewBg }};color:#e8ecef;font:inherit;font-size:13px;white-space:nowrap;cursor:pointer">전체 공구 검토</button></sc-if>
        <sc-for list="{{ looks }}"''', 1)
    template = template.replace('<span style="font-size:12px;color:#8f9aa1">공구 · 고르면 바로 정해집니다</span>', '''<div style="display:flex;gap:8px;flex-wrap:wrap">
          <button type="button" onClick="{{ toggleToolFocus }}" disabled="{{ toolFocusDisabled }}" aria-pressed="{{ toolFocused }}" style="padding:7px 10px;border:1px solid #38444d;border-radius:6px;background:#1b2329;color:#e8ecef;font:inherit;font-size:13px;cursor:pointer">{{ toolFocusLabel }}</button>
          <button type="button" onClick="{{ openFastenerParts }}" style="padding:7px 10px;border:1px solid #38444d;border-radius:6px;background:#1b2329;color:#e8ecef;font:inherit;font-size:13px;cursor:pointer">체결 부품 변경</button>
          </div>
          <span style="font-size:12px;color:#8f9aa1">공구 라이브러리 · 선택하면 이 단계에 적용됩니다</span>
          <div style="display:flex;gap:8px"><input aria-label="도구 검색" placeholder="도구 이름·규격 검색" value="{{ toolQuery }}" onChange="{{ searchTools }}" style="flex:1;min-width:0;padding:8px;border:1px solid #38444d;border-radius:6px;background:#0d1114;color:#e8ecef;font:inherit;font-size:13px">
          <button type="button" onClick="{{ toggleAllTools }}" style="padding:7px 8px;border:1px solid #38444d;border-radius:6px;background:#1b2329;color:#e8ecef;font:inherit;font-size:12px;cursor:pointer;white-space:nowrap">{{ allToolsLabel }}</button></div>
          <sc-if value="{{ noToolsFound }}"><span style="font-size:13px;color:#a7b2ba">검색 결과가 없습니다.</span></sc-if>''', 1)
    template = template.replace('<input value="{{ tmNm }}" onChange="{{ tmNmIn }}"', '<input aria-label="토크 (N·m)" value="{{ tmNm }}" onChange="{{ tmNmIn }}" onBlur="{{ tmNmBlur }}" onKeyDown="{{ tmNmKey }}"', 1)
    return template


def drawing_template(template, name):
    if name == 'DrawingFlowSteps':
        template = template.replace('position:fixed;inset:0;display:flex;', 'position:absolute;inset:0;display:flex;', 1)
        template = template.replace(
            'flex:1;min-height:0;overflow-y:auto;overflow-x:hidden;display:flex;flex-direction:column;gap:2px;',
            'flex:1;min-height:0;overflow-y:auto;overflow-x:hidden;scrollbar-width:none;display:flex;flex-direction:column;gap:2px;',
            1,
        )
        template = template.replace('onClick="{{ r.go }}" data-row="1"', 'onClick="{{ r.go }}" data-row="1" aria-current="{{ r.selected }}"', 1)
        template = template.replace('transition:background .2s ease,opacity .2s ease" style-hover="background:#151c21"',
                                    'transition:background .2s ease,opacity .2s ease" style-hover="{{ r.hover }}"', 1)
        template = template.replace(
            'style-hover="{{ r.hover }}">',
            '''style-hover="{{ r.hover }}">
                <sc-if value="{{ r.dropBefore }}"><span data-step-insertion-line="" aria-hidden="true" style="position:absolute;top:0;left:0;right:0;height:2px;background:#f37321;pointer-events:none"></span></sc-if>''',
            1,
        )
        template = template.replace(
            '<div onClick="{{ l.go }}" style="padding:7px 14px;border-radius:6px;font-size:13px;cursor:pointer;background:{{ l.bg }};color:{{ l.c }}">{{ l.ko }}</div>',
            '<button type="button" onClick="{{ l.go }}" style="padding:7px 14px;border:0;border-radius:6px;font:inherit;font-size:13px;cursor:pointer;background:{{ l.bg }};color:{{ l.c }}">{{ l.ko }}</button>',
            1,
        )
        template = template.replace(
            'visibility:{{ listVis }};background:#0d1114;border-right:1px solid #1a2026">',
            '''visibility:{{ listVis }};background:#0d1114;border-right:1px solid #1a2026">
      <sc-if value="{{ notTm }}"><button type="button" onClick="{{ goPrev }}" style="visibility:visible;align-self:flex-start;margin:12px 16px 0;padding:8px 12px;border:1px solid #35414a;border-radius:8px;background:#141a1f;color:#e8ecef;font:inherit;font-size:14px;cursor:pointer">← 03 조립도</button></sc-if>''',
            1,
        )
        template = template.replace(
            '<span style="font-size:14px;color:#ffffff;white-space:nowrap">{{ stTxt }}</span>',
            '''<sc-if value="{{ issueOn }}"><button type="button" onClick="{{ firstIssue }}" style="border:0;border-radius:6px;background:transparent;color:{{ stC }};font:inherit;font-size:14px;white-space:nowrap;cursor:pointer;text-decoration:underline">{{ issueTxt }}</button></sc-if>
        <sc-if value="{{ issueOff }}"><span style="font-size:14px;color:#ffffff;white-space:nowrap">{{ stTxt }}</span></sc-if>''',
            1,
        )
        template = template.replace(
            '<div onClick="{{ confirm }}" style="padding:7px 14px;border-radius:999px;background:{{ cfBg }};color:{{ cfC }};font-size:13px;font-weight:700;cursor:{{ cfCur }};white-space:nowrap">{{ cfTxt }}</div>',
            '''<sc-if value="{{ sequenceReview }}"><button type="button" onClick="{{ closeReview }}" style="padding:7px 10px;border:0;border-radius:999px;background:#222b31;color:#e8ecef;font:inherit;font-size:13px;cursor:pointer;white-space:nowrap">편집으로</button></sc-if>
        <button type="button" onClick="{{ confirm }}" disabled="{{ cfDisabled }}" style="padding:7px 14px;border:0;border-radius:999px;background:{{ cfBg }};color:{{ cfC }};font:inherit;font-size:13px;font-weight:700;cursor:{{ cfCur }};white-space:nowrap">{{ cfTxt }}</button>''',
            1,
        )
        template = template.replace('left:50%;bottom:20px;transform:translateX(-50%);z-index:7;', 'left:50%;bottom:54px;transform:translateX(-50%);z-index:7;', 1)
        template = template.replace('max-width:760px">', 'width:max-content;max-width:calc(100% - 36px);box-sizing:border-box">', 1)
        template = template.replace(
            '{{ lkMsgD }}</span></div>',
            '{{ lkMsgD }}</span><sc-if value="{{ lkHintFix }}"><span style="color:#ffd1b0;font-size:13px;line-height:1.4">{{ lkHintFix }}</span></sc-if></div>',
            1,
        )
        template = template.replace(
            '<sc-if value="{{ lkFixOn }}"',
            '''<sc-if value="{{ lkReviewOn }}"><button type="button" onClick="{{ lkReview }}" style="flex:none;padding:9px 14px;border:0;border-radius:8px;background:#ffc857;color:#221a08;font:inherit;font-size:13px;font-weight:700;cursor:pointer;white-space:nowrap">도면 확인 · 이 순서 유지</button></sc-if>
        <sc-if value="{{ lkFixOn }}"''',
            1,
        )
        template = template.replace('background:rgba(255,107,119,.1);box-shadow:inset 3px 0 0 #ff6b77;color:#ffc2c7',
                                    'background:{{ curWarnBg }};color:{{ curWarnC }}', 1)
        template = template.replace('<sc-if value="{{ curWarnOn }}" hint-placeholder-val="{{ false }}"><div style=',
                                    '<sc-if value="{{ curWarnOn }}" hint-placeholder-val="{{ false }}"><div data-step-warning="" style=', 1)
        template = template.replace(
            '<div onClick="{{ play }}" style="padding:7px 14px;border-radius:6px;font-size:13px;cursor:pointer;color:#e8ecef">▶ 재생</div>',
            '<button type="button" onClick="{{ play }}" style="padding:7px 14px;border:0;border-radius:6px;background:{{ playBg }};color:#e8ecef;font:inherit;font-size:13px;white-space:nowrap;cursor:pointer">{{ playTxt }}</button>',
            1,
        )
        template = template.replace('>STEP {{ curNo }} · {{ curTag }}</span>', ' data-current-step="">STEP {{ curNo }} · {{ curTag }}</span>', 1)
        template = template.replace(
            '{{ curWarn }}</div></sc-if>',
            '''<strong style="display:block;margin-bottom:4px">{{ curWarnTitle }}</strong>{{ curWarn }}
            <sc-if value="{{ curHint }}"><p style="margin:6px 0 0;color:#e8ecef">{{ curHint }}</p></sc-if>
            <sc-if value="{{ curReviewOn }}"><button type="button" onClick="{{ curReview }}" style="display:block;margin-top:8px;padding:7px 10px;border:0;border-radius:6px;background:#ffc857;color:#221a08;font:inherit;font-weight:700;cursor:pointer">도면 확인 · 이 순서 유지</button></sc-if>
            <sc-if value="{{ moreIssues }}"><button type="button" onClick="{{ nextIssue }}" style="margin-top:8px;padding:6px 9px;border:1px solid #594b38;border-radius:6px;background:#252017;color:{{ curWarnC }};font:inherit;cursor:pointer">다음 확인 항목 →</button></sc-if>
            </div></sc-if>''',
            1,
        )
        template = template.replace(
            '<span style="font-size:14px;color:#ffffff">{{ p.ko }}</span><span style="font:400 11px/1',
            '<span data-step-full-part-name="" style="font-size:14px;color:#ffffff;overflow-wrap:anywhere">{{ p.ko }}</span><span style="overflow-wrap:anywhere;font:400 11px/1',
            1,
        )
        template = template.replace(
            '<span style="font-size:{{ r.fs }};font-weight:700;color:#ffffff;line-height:1.3;text-wrap:pretty">{{ r.ko }}</span>',
            '<span data-step-part-name="" style="font-size:{{ r.fs }};font-weight:700;color:#ffffff;line-height:1.3;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">{{ r.ko }}</span>',
            1,
        )
        template = template.replace('gap:4px;min-width:0"><span style="font-size:15px;font-weight:700;color:{{ lkMsgC }}', 'gap:4px;min-width:0;overflow-wrap:anywhere"><span style="font-size:15px;font-weight:700;color:{{ lkMsgC }}', 1)
        template = template.replace(
            'position:relative;flex:none;width:56px;height:56px;border-radius:50%;background-color:#1a2228;background-image:{{ r.th }};background-size:78%;background-position:center;background-repeat:no-repeat;box-shadow:0 0 0 2px {{ r.ring }},0 0 0 5px #0d1114,{{ r.glow }}',
            'position:relative;flex:none;width:42px;height:40px;background-image:{{ r.th }};background-size:contain;background-position:center;background-repeat:no-repeat',
            1,
        )
        template = between(
            template, '<sc-if value="{{ r.small }}"', '<div style="display:flex;flex-direction:column;gap:4px;min-width:0;flex:1">',
            '<sc-if value="{{ r.small }}"><div title="체결" style="flex:none;width:42px;display:flex;justify-content:center;color:#ffb27a">'
            + chain_icon(22, vertical=True) + '</div></sc-if>\n                ',
        )
        template = template.replace('position:absolute;inset:0;border-radius:50%;background:rgba(13,17,20,.55);display:flex', 'position:absolute;inset:0;display:flex', 1)
        template = template.replace(' · 화살표로 위치 수정', '', 1)
        template = template.replace(
            '<span style="display:flex;align-items:center;gap:6px"><span style="width:10px;height:10px;border-radius:2px;background:#a9b1b6"></span>끝난 단계</span>',
            '''<sc-if value="{{ sequenceReview }}"><span style="color:#8f9aa1">번호를 눌러 단계 확인</span><span style="color:#ffc857">확인 필요</span><span style="color:#ff6b77">순서 검토</span></sc-if>
        <sc-if value="{{ sequenceEdit }}"><span style="display:flex;align-items:center;gap:6px"><span style="width:10px;height:10px;border-radius:2px;background:#a9b1b6"></span>끝난 단계</span></sc-if>''',
            1,
        )
        button_style = 'padding:7px 10px;border:1px solid #38444d;border-radius:6px;background:#1b2329;color:#e8ecef;font:inherit;font-size:13px;cursor:pointer'
        position_panel = f'''<sc-if value="{{{{ posCanEdit }}}}"><div data-position-editor="" style="display:flex;flex-direction:column;gap:10px;padding:12px;border:1px solid #2b353e;border-radius:8px;background:#141a1f">
          <strong style="font-size:14px;color:#ffffff">부품 위치</strong>
          <span data-position-status="" aria-live="polite" style="color:#c3cbd0;font-size:13px">{{{{ posStatus }}}}</span>
          <sc-if value="{{{{ posClosed }}}}"><button type="button" onClick="{{{{ posOpen }}}}" style="{button_style};align-self:flex-start">위치 수정</button></sc-if>
          <sc-if value="{{{{ posEditing }}}}">
            <span style="color:#a7b2ba;font-size:12px;line-height:1.45">3D 화살표를 끌어 조정하세요. 위치 적용을 누르면 검증과 저장에 반영됩니다.</span>
            <div style="display:flex;gap:6px;flex-wrap:wrap">
              <sc-if value="{{{{ posCanCompare }}}}"><button type="button" onClick="{{{{ posCompare }}}}" style="{button_style}">{{{{ posCompareLabel }}}}</button></sc-if>
              <sc-if value="{{{{ posCanReset }}}}"><button type="button" onClick="{{{{ posReset }}}}" style="{button_style}">원래 위치로</button></sc-if>
            </div>
            <div style="display:flex;gap:6px;flex-wrap:wrap">
              <button type="button" onClick="{{{{ posSave }}}}" disabled="{{{{ posSaveDisabled }}}}" style="{button_style};background:{{{{ posSaveBg }}}}">위치 적용</button>
              <button type="button" onClick="{{{{ posCancel }}}}" style="{button_style}">취소</button>
            </div>
          </sc-if>
        </div></sc-if>
        '''
        action_panel = '''<sc-if value="{{ actionPanel }}"><details data-step-action="" open="{{ actionExpanded }}" style="padding:10px 12px;border:1px solid #2b353e;border-radius:8px;background:#141a1f">
          <summary style="font-size:13px;color:#e8ecef;cursor:pointer">{{ actionTitle }}</summary>
          <div style="display:flex;flex-direction:column;gap:8px;padding-top:8px">
          <span aria-live="polite" style="color:#c3cbd0;font-size:13px">{{ actionSource }}</span>
          <div style="display:flex;gap:6px" aria-label="조립 유형" role="group">
            <sc-for list="{{ actionChoices }}" as="a"><button type="button" aria-pressed="{{ a.selected }}" onClick="{{ a.go }}" style="padding:7px 12px;border:1px solid {{ a.border }};border-radius:6px;background:{{ a.bg }};color:#fff;font:inherit;font-size:13px;cursor:pointer">{{ a.label }}</button></sc-for>
          </div>
          <sc-if value="{{ actionFollowup }}"><button type="button" onClick="{{ addFollowup }}" style="align-self:flex-start;padding:6px 9px;border:1px solid #38444d;border-radius:6px;background:#1b2329;color:#e8ecef;font:inherit;font-size:13px;cursor:pointer">후속 체결 단계 추가</button></sc-if>
          </div></details></sc-if>'''
        template = template.replace('<sc-if value="{{ curFasten }}"', action_panel + position_panel + '<sc-if value="{{ curFasten }}"', 1)
        batch_panel = '''<sc-if value="{{ batchReviewOn }}"><div data-contact-review-batch="" style="display:flex;flex-direction:column;gap:8px;padding:10px 12px;border:1px solid #51432c;border-radius:8px;background:#211d15">
          <button type="button" onClick="{{ toggleBatchReview }}" aria-expanded="{{ batchReviewOpen }}" style="align-self:flex-start;padding:6px 9px;border:1px solid #685433;border-radius:6px;background:#302618;color:#ffe0a0;font:inherit;font-size:13px;cursor:pointer">{{ batchReviewLabel }}</button>
          <sc-if value="{{ batchReviewOpen }}">
            <sc-for list="{{ batchReviewRows }}" as="r"><button type="button" onClick="{{ r.go }}" style="display:flex;flex-direction:column;gap:3px;padding:6px 0;border:0;background:transparent;color:#f6dfb1;font:inherit;font-size:13px;text-align:left;overflow-wrap:anywhere;cursor:pointer"><strong>{{ r.label }}</strong><span style="font-size:12px;color:#d2c6ad">{{ r.message }}</span></button></sc-for>
            <button type="button" onClick="{{ acceptBatchReview }}" style="align-self:flex-start;padding:7px 9px;border:0;border-radius:6px;background:#ffc857;color:#221a08;font:inherit;font-size:13px;font-weight:700;cursor:pointer">도면 대조 완료 · 표시된 순서 유지</button>
          </sc-if>
        </div></sc-if>'''
        template = template.replace('<sc-if value="{{ curWarnOn }}"', batch_panel + '<sc-if value="{{ curWarnOn }}"', 1)
        advice_panel = '''<sc-if value="{{ sequenceAdviceOn }}"><div data-sequence-advice="" style="display:flex;flex-direction:column;gap:8px;padding:10px 12px;border:1px solid #35414a;border-radius:8px;background:#141a1f">
          <strong style="font-size:14px;color:#e8ecef">로컬 Qwen 검토 의견</strong>
          <span aria-live="polite" style="color:#aab6bf;font-size:12px">{{ sequenceAdviceText }}</span>
          <sc-for list="{{ sequenceAdviceRows }}" as="r"><button type="button" onClick="{{ r.go }}" style="display:flex;flex-direction:column;gap:3px;padding:6px 0;border:0;background:transparent;color:#e8ecef;font:inherit;font-size:13px;text-align:left;overflow-wrap:anywhere;cursor:pointer"><strong>{{ r.label }}</strong><span style="color:#b8c6d0">{{ r.reason }}</span></button></sc-for>
        </div></sc-if>'''
        template = template.replace('<sc-if value="{{ batchReviewOn }}">', advice_panel + '<sc-if value="{{ batchReviewOn }}">', 1)
        return integrated_tool_template(step_viewport_template(template))
    template = re.sub(r'(<span title="{{ r.lkT }}"[^>]*>)<svg[^>]*>.*?</svg>',
                      lambda match: match[1] + chain_icon(15), template, count=1)
    tree_hint = '<div style="font-size:.85em;color:#aab3b9;text-wrap:pretty">3D에서 Shift + 드래그'
    template = template.replace(tree_hint, '<div style="font-size:.85em;color:#ffb27a">점선 · 형상에서 추정한 체결 연결</div>' + tree_hint, 1)
    template = re.sub(r'\s*<div onClick="{{ upSampleB }}".*?</div>', '', template, count=1)
    template = template.replace('시연용 STEP만', '형삭기 시연 모델')
    template = template.replace('type="file" multiple=', 'aria-label="STEP 및 PDF 파일 선택" type="file" multiple=', 1)
    template = template.replace('style="display:none"></input>', 'style="position:absolute;width:1px;height:1px;opacity:0"></input>', 1)
    template = template.replace('href="demo7/Demo 7 Drawing HUD.dc.html?drw=0&amp;proc=0"', 'onClick="{{ launchTraining }}" role="button" tabIndex="0" onKeyDown="{{ launchTrainingKey }}"')
    template = template.replace('href="Demo 7 전체.dc.html" style="padding:.9em 1.5em;',
                                'href="/training/upload?mode=lessons" style="padding:.9em 1.5em;')
    template = template.replace('교육 선택에서 보기', '교육 목록에서 보기')
    template = template.replace(
        '<div style="position:relative;flex:1;min-height:0;border-radius:8px;background-color:{{ prevBg }};',
        '''<sc-if value="{{ pdfInfo }}"><div style="color:#c3cbd0;font-size:.9em">{{ pdfInfo }}</div></sc-if>
        <div style="position:relative;flex:1;min-height:0;border-radius:8px;background-color:{{ prevBg }};''',
    )
    error = '<sc-if value="{{ upErrOn }}" hint-placeholder-val="{{ false }}"><div style="padding:.6em .8em;border-radius:8px;background:rgba(255,107,119,.1);color:#ffc2c7">{{ upErr }}</div></sc-if>'
    template = template.replace(error, '', 1)
    template = template.replace('<div onClick="{{ upStart }}"', error + '\n      <div onClick="{{ upStart }}"', 1)
    template = template.replace(
        '<span style="color:#c3cbd0">아직 올린 파일이 없습니다</span>',
        '<span style="color:#c3cbd0">아직 올린 파일이 없습니다</span><a href="/training/upload-dev" style="color:#ffb27a">PDF 도면만 분석하기</a><a href="/training/upload?mode=lessons" style="color:#c3cbd0">저장한 교육장 보기</a><a href="/training/upload?mode=step" style="color:#c3cbd0">STEP만 미리보기</a>',
        1,
    )
    return template


def adapt_step_controls(logic):
    logic = logic.replace('  pick(si, k, fit) {', '  pick(si, k, fit, fromPlayback = false) { if (!fromPlayback) this.stopPlayback();')
    logic = logic.replace('  setPlan(fn, msg, rfFrom) {', '''  setPlan(fn, msg, rfFrom, positionEdit = false, preserveReview = false) {
    this.stopPlayback();
    if (!preserveReview) this.discardSequenceReview();
    if (positionEdit || this.referenceState.lkMsg?.checked) this.updateReferenceState({ lkMsg: null, lkBad: -1 });''')
    logic = logic.replace('this.show(false); if (msg) this.say(msg);', 'this.show(false, !positionEdit); if (msg) this.say(msg);', 1)
    logic = logic.replace("this.updateReferenceState({ si, cur: k, swOpen: false }, () => this.show(fit));",
                          """const report = this.referenceState.lkMsg;
    const clearReport = report?.checked && (si !== this.referenceState.si || k !== this.referenceState.cur);
    this.updateReferenceState({ si, cur: k, swOpen: false, ...(clearReport ? { lkMsg: null, lkBad: -1 } : {}) }, () => this.show(fit));""")
    logic = logic.replace("if (e.key === 'Escape') this.updateReferenceState({ msel: [] });",
                          "if (e.key === 'Escape') { this.stopPlayback(); this.updateReferenceState({ msel: [] }); }")
    logic = logic.replace("c.addEventListener('pointerdown', e => { e.stopPropagation(); e.preventDefault();",
                          "c.addEventListener('pointerdown', e => { e.stopPropagation(); e.preventDefault(); this.stopPlayback();")
    logic = logic.replace("ds: e => { e.dataTransfer.effectAllowed = 'move';",
                          "ds: e => { this.stopPlayback(); e.dataTransfer.effectAllowed = 'move';")
    logic = logic.replace('  undo() {', '  undo() { this.stopPlayback();')
    logic = between(logic, '  lkFixFor(arr, k)', '  lkTools(arr)', '''  lkFixFor(arr, k) {
    if (arr[k].blank) return -1;
    const groups = this.lkSubs(arr), before = this.validate(arr);
    for (let j = k + 1; j < arr.length && groups[j] === groups[k]; j++) {
      if (arr[j].del || arr[j].blank) continue;
      const trial = arr.slice();
      trial.splice(j, 0, trial.splice(k, 1)[0]);
      const checks = this.validate(trial);
      if (checks[j].ok && !checks[j].review && checks.slice(k, j).every((check, i) => check.ok || !before[k + i + 1].ok)) return j;
    }
    return -1;
  }
  stepFixHint(step) {
    if (step.blank) return '부품 라이브러리에서 부품을 고르거나 이 단계를 삭제하세요.';
    if (step.t === 'fasten') return '도면에서 체결 대상을 확인하고, 그 부품을 이 체결 단계보다 앞에 배치하세요.';
    return '왼쪽 목록에서 이 부품을 받치거나 연결할 부품을 먼저 놓도록 순서를 바꾸세요. 순서가 맞으면 도면과 위치를 대조하세요.';
  }
  showStepIssue(arr, k, issue) {
    if (!this.activeSequenceReview() || !issue || (issue.ok && !issue.review)) return;
    const s = this.referenceState, step = arr[k], fix = issue.review ? -1 : this.lkFixFor(arr, k);
    const sub = this.lkSubs(arr)[k];
    const hint = issue.review ? '도면에서 체결 대상과 조립 순서를 확인한 뒤 현재 순서를 유지할 수 있습니다.'
      : fix < 0 ? this.stepFixHint(step) : this.lbl(arr, fix) + '번 ' + this.lkKo(arr[fix]) + ' 뒤로 옮기는 순서를 검토해 보세요.';
    this.pick(s.si, k, false);
    this.updateReferenceState({
      tab: 'det', lk: false, lkBad: issue.review ? -1 : k, lkMenu: null,
      open: { ...s.open, [s.si]: true },
      subCl: { ...s.subCl, [s.si + '-' + sub]: false },
      lkMsg: {
        c: issue.review ? '#ffc857' : '#ff6b77', bad: !issue.review, checked: true, fix, review: issue.review, index: k,
        t: this.lbl(arr, k) + '번 · ' + this.lkKo(step),
        d: issue.msg, hint, fixT: '추천 순서 적용'
      }
    });
  }
  acceptContactReview(index, review) {
    const snapshot = this.activeSequenceReview();
    if (!review || snapshot?.checks[index]?.review !== review) return;
    this.recordContactReviews(snapshot, [{ index, key: review }]);
  }
  acceptContactReviews() {
    const snapshot = this.activeSequenceReview();
    if (!snapshot || !this.referenceState.reviewBatchOpen) return;
    const pending = snapshot.checks.flatMap((check, index) => check.review ? [{ index, key: check.review }] : []);
    if (pending.length) this.recordContactReviews(snapshot, pending);
  }
  recordContactReviews(snapshot, pending) {
    const reviewed = new Set(pending.map(({ index }) => index));
    this.setPlan(plan => {
      for (const { index, key } of pending) plan[index].contactReview = key;
    }, '도면 확인 ' + pending.length + '건을 반영했습니다', undefined, false, true);
    const rows = this.referenceState.plan[snapshot.si];
    const checks = snapshot.checks.map((check, index) => reviewed.has(index) ? { ...check, review: undefined, reviewed: true } : check);
    this.updateReferenceState({ reviewSnapshot: { ...snapshot, rows, checks }, reviewBatchOpen: false });
    clearTimeout(this._as);
    this.autoSave();
  }
  activeSequenceReview(s = this.referenceState) {
    const snapshot = s.reviewSnapshot;
    return s.sequenceReview && snapshot?.si === s.si && snapshot.rows === s.plan?.[s.si] ? snapshot : null;
  }
  discardSequenceReview() {
    if (!this.referenceState.sequenceReview) return;
    this.cancelSequenceAdvice();
    this.updateReferenceState({ sequenceReview: false, reviewSnapshot: null, reviewBatchOpen: false, lkMenu: null, lkMsg: null, lkBad: -1 });
  }
  openSequenceReview(arr) {
    const s = this.referenceState;
    if (!arr.some(step => !step.del) || s.confirmed) return;
    if (this.activePositionEdit(s)) { this.say('위치를 적용하거나 취소한 뒤 검증하세요'); return; }
    this.stopPlayback();
    const checks = this.validate(arr), snapshot = { si: s.si, rows: arr, checks };
    this.updateReferenceState({ sequenceReview: true, reviewSnapshot: snapshot, tab: 'det', toolFocus: false, swOpen: false, lk: false, lkMenu: null, lkMsg: null, lkBad: -1 }, () => this.show(true, false));
    void this.requestSequenceAdvice(snapshot);
    const issue = checks.findIndex(check => !check.ok);
    const first = issue >= 0 ? issue : checks.findIndex(check => check.review);
    if (first >= 0) this.showStepIssue(arr, first, checks[first]);
  }
  closeSequenceReview() {
    if (!this.referenceState.sequenceReview) return;
    this.stopPlayback();
    this.discardSequenceReview();
    this.show(false, false);
  }
  confirmSequence() {
    const s = this.referenceState;
    const snapshot = this.activeSequenceReview(s);
    if (!snapshot || s.confirmed) return;
    const { rows: arr, checks } = snapshot;
    if (this.activePositionEdit(s)) { this.say('위치를 적용하거나 취소한 뒤 검증하세요'); return; }
    this.stopPlayback();
    const opinions = checks.filter(check => !check.ok || check.review).length + (s.sequenceAdvice?.items?.length ?? 0);
    this.cancelSequenceAdvice();
    const rows = arr.filter(step => !step.del).map(step => ({ ...step, isNew: false }));
    const plan = s.plan.slice();
    plan[s.si] = rows;
    const cur = Math.max(0, arr.slice(0, s.cur + 1).filter(step => !step.del).length - 1);
    const reviewed = checks.filter(check => check.reviewed).length;
    const detail = opinions ? '검토 의견 ' + opinions + '건 · 관리자가 현재 순서를 확정했습니다'
      : reviewed ? '도면 확인 ' + reviewed + '건을 반영했습니다 · ' + rows.length + '단계'
      : rows.length + '단계가 확정되었습니다 · 교육장에 반영됩니다';
    this.updateReferenceState({
      plan, cur, confirmed: true, sequenceReview: false, reviewSnapshot: null, reviewBatchOpen: false, lk: false, lkBad: -1,
      lkMsg: { c: '#3fe0c5', t: opinions ? '관리자가 현재 순서를 확정했습니다' : '형상 검토 완료 · 이 순서로 확정했습니다', d: detail }
    }, () => { this.show(false); this.autoSave(); });
  }
  stopPlayback() {
    if (this.pl == null) return;
    clearInterval(this.pl);
    this.pl = null;
    this.updateReferenceState({ playing: false });
  }
  togglePlayback() {
    if (this.pl != null) { this.stopPlayback(); return; }
    const { plan, si, cur, tm } = this.referenceState;
    const steps = (plan?.[si] || []).flatMap((step, i) => step.del || step.blank || (tm && step.t !== 'fasten') ? [] : [i]);
    if (!steps.length) return;
    let position = steps.indexOf(cur);
    if (position < 0 || position === steps.length - 1) position = 0;
    this.pick(si, steps[position], false, true);
    if (steps.length === 1) return;
    this.pl = this.repeat(() => {
      position++;
      this.pick(si, steps[position], false, true);
      if (position === steps.length - 1) this.stopPlayback();
    }, 1100);
    this.updateReferenceState({ playing: true });
  }
''')
    logic = logic.replace("    const PG = ['파일 올리기'", """    const snapshot = this.activeSequenceReview(s), checks = snapshot?.checks || [];
    const problems = checks.flatMap((check, i) => check.ok ? [] : [i]);
    const reviews = checks.flatMap((check, i) => check.review ? [i] : []);
    const issues = [...problems, ...reviews];
    const currentIssue = checks[s.cur] && (!checks[s.cur].ok || checks[s.cur].review) ? checks[s.cur] : null;
    const orderedIssues = [...issues].sort((a, b) => a - b);
    const nextProblem = orderedIssues.find(i => i > s.cur) ?? orderedIssues[0];
    const PG = ['파일 올리기'""")
    logic = logic.replace("const wr = this.warns(plan[gi])[i], tg = x.t === 'fasten' ? this.target(plan[gi], i) : ''; ", "", 1)
    logic = logic.replace("wr ? '#ff6b77' : ", "")
    logic = logic.replace("wr ? 'rgba(255,107,119,.07)' : ", "", 1)
    logic = between(logic, '        const tag = wr ?', '        return { no:', '''        const tag = x.isNew ? '새 부품' : fz ? '체결' : '놓기 · ' + (x.off ? '위치 수정됨' : '원래 위치');
        const tag2 = s.tm && fz ? (x.toolOk ? '' : '확인 필요 · ') + this.TL.find(t => t.k === this.toolK(x)).ko + (tqv ? ' · ' + tqv + ' N·m' : '') : tag;
''')
    logic = logic.replace("bg: sel ? 'rgba(255,255,255,.07)' :", "selected: sel, hover: sel ? 'background:#4a2c1c' : 'background:#151c21', bg: sel ? '#3e261a' :", 1)
    logic = logic.replace("numC: sel ? O : '#c3cbd0'", "numC: sel ? '#ffb477' : '#c3cbd0'", 1)
    logic = logic.replace("tsh: ov ? 'inset 0 2px 0 ' + O : 'none'", "dropBefore: ov, tsh: sel ? 'inset 0 0 0 1px #c8753d' : 'none'", 1)
    logic = logic.replace(
        "lkBadOn: !!(s.lkMsg && s.lkMsg.bad), lkOkOn: !!(s.lkMsg && !s.lkMsg.bad),",
        "lkHintFix: s.lkMsg?.hint || '', lkReviewOn: !!s.lkMsg?.review, lkReview: () => this.acceptContactReview(s.lkMsg?.index, s.lkMsg?.review), lkBadOn: !!(s.lkMsg?.bad && !s.lkMsg.checked), lkOkOn: !!(s.lkMsg && (!s.lkMsg.bad || s.lkMsg.checked)),",
    )
    logic = logic.replace("curWarnOn: !!W[s.cur], curWarn: W[s.cur] || '',", """curWarnOn: !!currentIssue, curWarn: currentIssue?.msg || '',
      curWarnTitle: this.lbl(arr, s.cur) + '번 단계 확인',
      curWarnC: currentIssue?.review ? '#ffc857' : '#ffc2c7',
      curWarnBg: currentIssue?.review ? 'rgba(255,200,87,.09)' : 'rgba(255,107,119,.1)',
      curReviewOn: !!currentIssue?.review, curReview: () => this.acceptContactReview(s.cur, currentIssue?.review),
      curHint: currentIssue && cur ? (currentIssue.review ? '도면에서 체결 대상과 조립 순서를 확인해 주세요.'
        : s.lkMsg?.checked && s.lkBad === s.cur ? s.lkMsg.hint : this.stepFixHint(cur)) : '',
      moreIssues: issues.length > 1, nextIssue: () => this.showStepIssue(arr, nextProblem, checks[nextProblem]),""")
    logic = between(logic, '      prev: go(-1), next: go(1), play:', '      tabs:', '''      prev: go(-1), next: go(1), play: () => this.togglePlayback(),
      playTxt: s.playing ? '❚❚ 일시정지' : '▶ 재생', playBg: s.playing ? '#53321d' : 'transparent',
''')
    logic = between(logic, '      ...(() => { const arr = (s.plan && s.plan[s.si])', '      cfTxt:', '''      stTxt: s.confirmed ? '확정됨 · ' + arr.length + '단계'
        : s.sequenceReview ? '전체 순서 · ' + arr.filter(step => !step.del).length + '단계' : '편집 중',
      issueOn: issues.length > 0, issueOff: issues.length === 0,
      batchReviewOn: !!snapshot && reviews.length > 1,
      batchReviewOpen: !!s.reviewBatchOpen,
      batchReviewLabel: '확인 필요 ' + reviews.length + '건 함께 보기',
      toggleBatchReview: () => this.updateReferenceState({ reviewBatchOpen: !s.reviewBatchOpen }),
      batchReviewRows: s.reviewBatchOpen ? reviews.map(i => ({ label: this.lbl(arr, i) + '번 · ' + this.lkKo(arr[i]), message: checks[i].msg, go: () => this.showStepIssue(arr, i, checks[i]) })) : [],
      acceptBatchReview: () => this.acceptContactReviews(),
      issueTxt: problems.length ? '순서 검토 ' + problems.length + '건 보기' + (reviews.length ? ' · 확인 ' + reviews.length + '건' : '')
        : '확인 필요 ' + reviews.length + '건 보기',
      firstIssue: () => this.showStepIssue(arr, issues[0], checks[issues[0]]),
      stC: problems.length ? '#ff6b77' : reviews.length ? '#ffc857' : snapshot || s.confirmed ? '#3fe0c5' : '#8f9aa1',
      stBd: problems.length ? '#ff6b77' : reviews.length ? '#9c752b' : snapshot || s.confirmed ? 'rgba(63,224,197,.45)' : '#38444d',
      cfBg: s.confirmed ? '#1a2021' : '#f37321',
      cfC: s.confirmed ? '#5d676e' : '#ffffff',
      sequenceReview: !!s.sequenceReview,
      sequenceEdit: !s.sequenceReview,
      closeReview: () => this.closeSequenceReview(),
      cfDisabled: !arr.some(step => !step.del) || !!s.confirmed || (!!s.sequenceReview && !snapshot),
      cfCur: s.confirmed ? 'default' : 'pointer',
      confirm: () => s.sequenceReview ? this.confirmSequence() : this.openSequenceReview(arr),
''')
    logic = logic.replace("cfTxt: s.confirmed ? '확정됨' : '검증 후 확정'", "cfTxt: s.confirmed ? '확정됨' : s.sequenceReview ? '이 순서 확정' : '검증'", 1)
    logic = logic.replace(
        "else this.updateReferenceState({ lkMsg: { c: '#3fe0c5', t: this.lkSubName(sb) + ' · 순서 확인됨'",
        """else if (res.some((check, i) => check.review && subs[i] === sb)) {
      this.updateReferenceState({ lkMsg: { c: '#ffc857', t: '체결 확인 필요', d: '상단에서 확인이 필요한 체결 단계를 열어 도면과 대조하세요.' } });
    } else this.updateReferenceState({ lkMsg: { c: '#3fe0c5', t: this.lkSubName(sb) + ' · 순서 확인됨'""",
        1,
    )
    return logic


def adapt_step_positions(logic):
    logic = logic.replace(
        'applyOff(off) { const T = window.THREE, wire = this.referenceState.look === \'wire\'; this.E.anim = []; this.curPieces().forEach',
        'applyOff(off, pieces) { const T = window.THREE; this.E.anim = []; pieces.forEach',
    )
    logic = logic.replace('  lkPcs(x) { const pr = this.pr, si = this.referenceState.si;', '  lkPcs(x, si = this.referenceState.si) { const pr = this.pr;')
    logic = between(logic, '  validate(arr) {', '  lkFixFor(arr, k)', '''  stepOffsets(arr, si) {
    const offsets = new Map();
    for (const step of arr) {
      if (step.del || step.blank || !step.off) continue;
      for (const i of this.lkPcs(step, si)) {
        if (!offsets.has(i)) offsets.set(i, step.off);
      }
    }
    return offsets;
  }
  hashContactReview(value) {
    const text = JSON.stringify(value);
    let hash = 2166136261;
    for (let i = 0; i < text.length; i++) hash = Math.imul(hash ^ text.charCodeAt(i), 16777619);
    return (hash >>> 0).toString(36);
  }
  legacyContactReviewKey(arr, si) {
    const rows = arr.filter(step => !step.del).map(step => [step.t, step.part, step.pcs, step.off, step.sw?.ko]);
    return this.hashContactReview([si, rows]);
  }
  validate(arr, si = this.referenceState.si) {
    const T = window.THREE, tol = this.lkTol(), sec = this.pr.sections[si], placed = [];
    const floor = sec.idx.reduce((min, i) => Math.min(min, this.lkB(i).min.y), Infinity);
    const geometry = arr.some(step => step.t === 'fasten' && !step.del) ? this.getFlowContactGeometry() : null;
    const offsets = this.stepOffsets(arr, si), shifted = new Map(), earlier = new Set(), locations = new Map();
    for (const [i, off] of offsets) {
      shifted.set(i, this.lkB(i).clone().translate(new T.Vector3(...off)));
    }
    if (geometry) this.pr.sections.forEach((section, groupIndex) => {
      if (section.final && groupIndex !== si) return;
      const rows = groupIndex === si ? arr : this.referenceState.plan?.[groupIndex] || [];
      if (groupIndex !== si) for (const [i, off] of this.stepOffsets(rows, groupIndex)) {
        if (!offsets.has(i)) offsets.set(i, off);
      }
      rows.forEach((step, k) => {
        if (step.t !== 'place' || step.del || step.blank) return;
        for (const i of this.lkPcs(step, groupIndex)) {
          if (!locations.has(i)) locations.set(i, { si: groupIndex, k, rows });
          if (groupIndex < si) earlier.add(i);
        }
      });
    });
    let group = null, legacyKey;
    const started = new Set();
    return arr.map(step => {
      if (step.del) return { ok: true, msg: '', del: 1 };
      if (step.blank) return { ok: false, msg: '비어 있는 단계입니다. 넣을 부품을 고르거나 지우세요.' };
      group = step.sub ?? group;
      const indices = this.lkPcs(step, si), boxes = indices.map(i => shifted.get(i) ?? this.lkB(i));
      let ok, review, reviewed = false, msg = '';
      if (step.t === 'fasten') {
        const fits = indices.map(i => geometry?.evidence(i, offsets) || { targets: [], candidates: [] });
        const identified = step.sw ? [] : fits.flatMap(fit => fit.targets.map(target => target.index));
        const outside = i => (locations.get(i)?.si ?? si) > si;
        const waiting = identified.find(i => !earlier.has(i) && !outside(i));
        const crossSection = identified.some(i => outside(i) && !earlier.has(i));
        const uncertain = step.sw ? indices.length : fits.filter(fit => !fit.targets.length || fit.targets.some(target => outside(target.index) && !earlier.has(target.index))).length;
        ok = waiting == null && (identified.length > 0 || earlier.size > 0);
        if (waiting != null) {
          const target = this.pr.parts[this.pr.pieces[waiting].part].ko, at = locations.get(waiting);
          const position = at && (at.si === si ? '' : '구간 ' + this.pr.sections[at.si].no + ' · ') + this.lbl(at.rows, at.k) + '번';
          msg = position ? '체결 대상 ' + target + '은(는) ' + position + '에 배치됩니다. 체결 전에 이 부품을 놓으세요.'
            : '체결 대상 ' + target + '의 배치 단계가 없습니다. 체결 전에 배치 단계를 추가하세요.';
        } else if (!ok) msg = '먼저 놓인 부품이 0개 확인됐습니다. 체결할 부품을 먼저 배치하세요.';
        else if (uncertain || !indices.length) {
          const candidates = [...new Set(fits.flatMap(fit => fit.candidates))].sort((a, b) => a - b);
          const reviewKey = 'v2-' + this.hashContactReview([si, step.part, indices.map(i => [i, offsets.get(i)]), step.sw?.ko,
            [...earlier].sort((a, b) => a - b), candidates.map(i => [i, offsets.get(i)])]);
          if (typeof step.contactReview === 'string' && !step.contactReview.startsWith('v2-')) legacyKey ??= this.legacyContactReviewKey(arr, si);
          reviewed = !!step.contactReview && (step.contactReview === reviewKey || step.contactReview === legacyKey);
          if (!reviewed) {
            review = reviewKey;
            const partial = indices.length > 1 ? indices.length + '개 중 ' + uncertain + '개는 ' : '';
            msg = crossSection ? '뒤 구간에 있는 부품도 체결 후보로 탐색됐습니다. 도면에서 어느 구간에서 체결하는지 확인하세요.'
              : partial + 'STEP 형상에서 체결 상대를 확정하기 어렵습니다.'
                + (candidates.length ? ' 주변 후보 ' + candidates.length + '개를 도면과 대조하세요.' : ' 도면에서 고정 위치를 확인하세요.');
          }
        }
      } else {
        const siblings = boxes.map(box => box.clone().expandByScalar(tol * 0.5));
        ok = !started.has(group) || boxes.every((box, i) => {
          const reach = box.clone().expandByScalar(tol);
          return box.min.y <= floor + tol || placed.some(prior => prior.bounds.intersectsBox(reach)) ||
            siblings.some((other, j) => j !== i && other.intersectsBox(box));
        });
        started.add(group);
        if (!ok) msg = this.lkKo(step) + '을(를) 받치거나 붙을 부품이 아직 없습니다.';
        for (const i of indices) earlier.add(i);
      }
      for (const box of boxes) placed.push({ part: step.part, type: step.t, bounds: box.clone().expandByScalar(tol * 0.5) });
      return { ok, msg, review, reviewed };
    });
  }
''')
    logic = logic.replace('warns(arr) {', 'warns(arr, si = this.referenceState.si) {')
    logic = logic.replace('hv.si === this.referenceState.si', 'hv.si === si')
    logic = logic.replace('const w = this.warns0(arr); this._wm.set(arr, { si: this.referenceState.si, w });', 'const w = this.warns0(arr, si); this._wm.set(arr, { si, w });')
    logic = logic.replace('warns0(arr) {', 'warns0(arr, si) {')
    logic = logic.replace("const r = this.validate(arr); arr.forEach", "const r = this.validate(arr, si); arr.forEach", 1)
    logic = logic.replace('plan.reduce((t, a) => t + Object.keys(this.warns(a))', 'plan.reduce((t, a, gi) => t + Object.keys(this.warns(a, gi))')
    logic = logic.replace("'nmEd', 'sw', 'ok'];", "'nmEd', 'sw', 'ok', 'off', 'contactReview'];", 1)
    logic = logic.replace('const offOf = {}; plan.forEach(x => { if (x.off && offOf[x.part] == null) offOf[x.part] = x.off; });',
                          'const offsets = this.stepOffsets(plan, si);')
    logic = logic.replace('const of = offOf[pc.part], home', 'const of = offsets.get(i), home')
    return logic


def adapt_step_position_editor(logic):
    logic = between(logic, '  gzStart(axis, e) {', '  curPieces()', '''  activePositionEdit(s = this.referenceState) {
    const edit = s.positionDraft;
    return edit && !s.tm && s.tab === 'det' && !s.lk && !s.playing &&
      edit.si === s.si && edit.index === s.cur && edit.step === s.plan?.[s.si]?.[s.cur] ? edit : null;
  }
  positionEditorVals(s, step) {
    const edit = this.activePositionEdit(s);
    const canEdit = !s.tm && !!step && !step.del && !step.blank && this.lkPcs(step, s.si).length > 0;
    const saved = step?.off;
    const offset = edit?.offset === undefined ? saved : edit.offset;
    const moved = !!offset?.some(value => Math.abs(value) >= 0.001);
    const changed = !!edit && edit.offset !== undefined &&
      (offset || [0, 0, 0]).some((value, axis) => Math.abs(value - (saved?.[axis] ?? 0)) >= 0.001);
    const canSave = changed && !edit.original;
    const coords = moved ? offset.map((value, axis) => 'XYZ'[axis] + ' ' + value.toFixed(1)).join(' · ') + ' mm' : '';
    return {
      posCanEdit: canEdit, posClosed: !edit, posEditing: !!edit,
      posStatus: edit?.original ? 'STEP 원래 위치 비교 중' : moved ? (changed ? '미리보기 · ' : '수정됨 · ') + coords : 'STEP 원래 위치',
      posCanCompare: !!edit && moved, posCanReset: !!edit && moved,
      posCompareLabel: edit?.original ? '수정 위치 보기' : '원래 위치 보기',
      posSaveDisabled: !canSave, posSaveBg: canSave ? '#a84717' : '#1b2329',
      posOpen: () => {
        this.stopPlayback();
        this.lkStop();
        this.updateReferenceState({ lk: false, positionDraft: { si: s.si, index: s.cur, step } }, () => this.show(false, false));
      },
      posCompare: () => this.updateReferenceState({ positionDraft: { ...edit, original: !edit.original } }, () => this.show(false, false)),
      posReset: () => this.updateReferenceState({ positionDraft: { ...edit, original: false, offset: null } }, () => this.show(false, false)),
      posCancel: () => this.closePositionEdit(),
      posSave: () => {
        if (!canSave || this.activePositionEdit() !== edit) return;
        this.setPlan((_, plan) => {
          const row = plan[edit.si][edit.index];
          if (moved) row.off = offset;
          else delete row.off;
        }, moved ? '부품 위치 적용' : 'STEP 원래 위치로 복원', edit.index + 1, true);
      }
    };
  }
  closePositionEdit() {
    if (this.referenceState.positionDraft) this.updateReferenceState({ positionDraft: null }, () => this.show(false, false));
  }
  gzStart(axis, e) {
    const edit = this.activePositionEdit(), A = this.gzAx?.[axis];
    if (!edit || edit.original || e.button !== 0 || !A || A.ppu < 1e-4) return;
    e.stopPropagation();
    e.preventDefault();
    const pieces = this.curPieces(), scale = this.referenceState.scale || 1;
    const offset = edit.offset === undefined ? edit.step.off : edit.offset;
    const start = offset || [0, 0, 0], k = { x: 0, y: 1, z: 2 }[axis];
    const { pointerId, clientX, clientY } = e;
    let draft = null;
    this.gzDrag = axis;
    const move = ev => {
      if (ev.pointerId !== pointerId || this.activePositionEdit() !== edit) return;
      const dx = ev.clientX - clientX, dy = ev.clientY - clientY;
      draft = start.slice();
      draft[k] += (dx * A.ux + dy * A.uy) / (scale * A.ppu);
      this.applyOff(draft, pieces);
    };
    const finish = ev => {
      if (ev.pointerId !== pointerId) return;
      this.gzDrag = null;
      this.unlisten('pointermove', move);
      this.unlisten('pointerup', finish);
      this.unlisten('pointercancel', finish);
      if (!draft) return;
      if (ev.type === 'pointercancel' || this.activePositionEdit() !== edit) { this.show(false, false); return; }
      this.updateReferenceState({ positionDraft: { ...edit, offset: draft } }, () => this.show(false, false));
    };
    this.listen('pointermove', move);
    this.listen('pointerup', finish);
    this.listen('pointercancel', finish);
  }
''')
    logic = logic.replace("if (this.referenceState.lk) { g.style.display = 'none'; return; } const ps = this.curPieces();",
                          "const edit = this.activePositionEdit(); if (!edit || edit.original) { g.style.display = 'none'; return; } const ps = this.curPieces();", 1)
    logic = logic.replace('return { plan, rf: rfFrom', 'return { plan, positionDraft: null, rf: rfFrom', 1)
    logic = logic.replace("if (e.key === 'Escape') { this.stopPlayback();", "if (e.key === 'Escape') { this.closePositionEdit(); this.stopPlayback();", 1)
    logic = logic.replace('    this.tmGo(!!this.props.tools);', '    this.closePositionEdit();\n    this.tmGo(!!this.props.tools);', 1)
    logic = logic.replace('    this.pick(si, steps[position], false, true);', '    this.closePositionEdit();\n    this.pick(si, steps[position], false, true);', 1)
    logic = logic.replace("    const clearReport = report?.checked && (si !== this.referenceState.si || k !== this.referenceState.cur);",
                          "    const selectionChanged = si !== this.referenceState.si || k !== this.referenceState.cur;\n    const clearReport = report?.checked && selectionChanged;")
    logic = logic.replace('swOpen: false, ...(clearReport', 'swOpen: false, ...(selectionChanged ? { positionDraft: null } : {}), ...(clearReport', 1)
    logic = logic.replace("go: () => this.updateReferenceState({ tab: k })", "go: () => { if (k !== s.tab) { this.closePositionEdit(); this.updateReferenceState({ tab: k }); } }", 1)
    logic = logic.replace("aiLib: () => this.updateReferenceState({ tab: 'lib' })", "aiLib: () => { this.closePositionEdit(); this.updateReferenceState({ tab: 'lib' }); }", 1)
    logic = logic.replace('const offsets = this.stepOffsets(plan, si);', '''const edit = !pv && this.activePositionEdit(s);
    const previewPlan = edit && edit.offset !== undefined
      ? plan.map((row, index) => index === edit.index ? { ...row, off: edit.offset } : row) : plan;
    const offsets = this.stepOffsets(previewPlan, si);
    if (edit?.original) for (const i of this.lkPcs(edit.step, si)) offsets.delete(i);''', 1)
    logic = between(logic, 'posTxt: off ?', '\n      gzRef:', '...this.positionEditorVals(s, cur),')
    logic = logic.replace("off ? '위치 수정됨' : 'STEP ' + String(s.cur + 1).padStart(2, '0')", "'위치 수정'", 1)
    logic = logic.replace(' : 0, off = cur && cur.off;', ' : 0;', 1)
    return logic


def adapt_step_rendering(logic):
    logic = between(logic, '  lkHi3d(list)', '  lkKey(x)', '''  stepLineMaterials() {
    if (!this.stepLines) {
      const line = (color, opacity) => new window.THREE.LineBasicMaterial({ color, opacity, transparent: true, depthWrite: false });
      this.stepLines = {
        darkEdge: line(0x252d35, 0.95), lightEdge: line(0x9daebc, 0.8),
        wireEdge: line(0x8294a3, 0.42), hotEdge: line(0xff9f55, 1),
        ghost: line(0x647583, 0.25), preview: line(0x9aabb9, 0.42)
      };
    }
    return this.stepLines;
  }
  buildStepEdges(solid) {
    const T = window.THREE, edges = new T.Group();
    const materials = this.stepLineMaterials();
    solid.updateMatrixWorld(true);
    const inverse = new T.Matrix4().copy(solid.matrixWorld).invert();
    solid.traverse(mesh => {
      if (!mesh.isMesh) return;
      const surface = mesh.material, color = surface.color;
      surface.polygonOffset = true;
      surface.polygonOffsetFactor = 1;
      surface.polygonOffsetUnits = 2;
      const luminance = color.r * 0.2126 + color.g * 0.7152 + color.b * 0.0722;
      const base = luminance < 0.16 ? materials.lightEdge : materials.darkEdge;
      const { geometry, edgeVertices } = createStepWireGeometry(T, mesh.geometry);
      const line = new T.LineSegments(geometry, base);
      line.userData.solidEdge = base;
      line.userData.edgeVertices = edgeVertices;
      line.renderOrder = 2;
      line.applyMatrix4(new T.Matrix4().multiplyMatrices(inverse, mesh.matrixWorld));
      edges.add(line);
    });
    return edges;
  }
  paintStepEdges(piece, color, wire = false) {
    for (const line of piece.wireM.children) {
      line.material = color || line.userData.solidEdge;
      line.geometry.setDrawRange(0, wire ? Infinity : line.userData.edgeVertices);
    }
  }
  lkHi3d(list) {
    const key = list.join(',');
    if (key === this._hiKey) return;
    for (const i of this._hiList || []) {
      const piece = this.pr.pieces[i];
      this.paintStepEdges(piece, piece.stepEdgeStyle);
    }
    for (const i of list) this.paintStepEdges(this.pr.pieces[i], this.stepLines.hotEdge);
    this._hiList = list;
    this._hiKey = key;
  }
''')
    logic = logic.replace('return piece.obj.visible || piece.wireM.visible;', 'return piece.obj.visible;')
    logic = logic.replace(' if (pc.edgeO) this.E.snap(pc.edgeO, p, pc.q);', '')
    logic = logic.replace("wire = s.look === 'wire';", "wire = s.tm && s.look === 'wire';")
    logic = logic.replace('show(fit) { this.show0(fit);', 'show(fit, animate = true) { this.show0(fit, animate);')
    logic = logic.replace('show0(fit) {', 'show0(fit, animate) {')
    logic = between(logic, '    if (!this.ghM) this.ghM', '    const offOf =', '''    const materials = this.stepLineMaterials();
    const selected = new Set(plan[k] && !plan[k].del ? this.lkPcs(plan[k]) : []);
    const preview = s.tm ? s.ghost : s.showFuture;
    E.grid.material.opacity = wire ? 0.32 : 0.25;
''')
    logic = logic.replace(
        '    const mat = (g, m) => g.traverse(c => { if (c.isLineSegments) c.material = m; });\n',
        '',
    )
    logic = between(logic, '      if (!pc.edgeO) {', '    });\n    if (fit)', '''      pc.obj.visible = false;
      if (j == null) return;
      const of = offOf[pc.part], home = of ? pc.home.clone().add(new T.Vector3(of[0], of[1], of[2])) : pc.home;
      E.snap(pc.obj, home, pc.q);
      E.snap(pc.wireM, home, pc.q);
      if (j > k && !s.sequenceReview) {
        if (preview) {
          this.paintStepEdges(pc, s.tm ? materials.ghost : materials.preview, true);
          pc.wireM.visible = true;
        }
        return;
      }
      pc.stepEdgeStyle = selected.has(i) ? materials.hotEdge : wire ? materials.wireEdge : null;
      this.paintStepEdges(pc, pc.stepEdgeStyle, wire);
      pc.wireM.visible = true;
      pc.obj.visible = !wire;
      if (animate && !s.sequenceReview && j === k) {
        const up = home.clone().add(new T.Vector3(0, E.sz * 0.25, 0));
        for (const object of wire ? [pc.wireM] : [pc.obj, pc.wireM]) {
          E.snap(object, up, pc.q);
          E.move(object, home, pc.q, 0.25, 3);
        }
      }
''')
    return logic


def adapt_step_labels(logic):
    link = json.dumps(chain_icon(16, vertical=True))
    logic = between(logic, "      const fz = x.t === 'fasten', c = document.createElement('div');", "      const lab = document.createElement('div');", '''      const fz = x.t === 'fasten', c = document.createElement('div');
      c.setAttribute('data-lk', k);
      if (fz) {
        c.dataset.stepKind = 'fasten';
        c.insertAdjacentHTML('afterbegin', ''' + link + ''');
        c.firstElementChild.style.color = 'var(--fasten-link-color, #ffb27a)';
      }
      const tx = document.createElement('span');
      tx.textContent = this.lbl(this.referenceState.plan[this.referenceState.si], k);
      tx.style.pointerEvents = 'none';
      c.appendChild(tx);
      c.style.cssText = "position:absolute;left:0;top:0;width:34px;height:34px;margin:-17px 0 0 -17px;display:flex;align-items:center;justify-content:center;font:700 12px/1 var(--font-mono),'JetBrains Mono',monospace;pointer-events:auto;cursor:grab;transition:background .15s,box-shadow .15s,color .15s;user-select:none";
      c.style.borderRadius = fz ? '8px' : '50%';
      if (fz) {
        c.style.flexDirection = 'column';
        c.style.gap = '1px';
        tx.style.fontSize = '10px';
      }
''')
    logic = logic.replace(" + (e.c._fz ? ' rotate(45deg)' : '')", '', 1)
    logic = logic.replace(
        "e.c.style.color = head ? '#0a0d10' : dimN ? '#6b757c' : '#ffffff';",
        """e.c.style.color = head ? '#0a0d10' : dimN ? '#6b757c' : '#ffffff';
      if (e.c.dataset.stepKind === 'fasten') e.c.style.setProperty('--fasten-link-color', head || dragMe ? '#24160e' : bad ? R : dimN ? '#a1785a' : '#ffb27a');""",
        1,
    )
    logic = logic.replace(
        "      c.addEventListener('pointerenter',",
        """      c.addEventListener('contextmenu', e => {
        e.preventDefault();
        e.stopPropagation();
        if (this.lkDrag) return;
        const { si, cur } = this.referenceState;
        if (cur !== k) this.pick(si, k, false);
        else this.stopPlayback();
        this.updateReferenceState({ lkMenu: k });
      });
      c.addEventListener('pointerenter',""",
        1,
    )
    logic = logic.replace(
        "c.addEventListener('pointerdown', e => { e.stopPropagation(); e.preventDefault(); this.stopPlayback();",
        """c.addEventListener('pointerdown', e => {
        e.stopPropagation();
        if (e.button !== 0) return;
        e.preventDefault();
        if (this.referenceState.lkMenu != null) this.updateReferenceState({ lkMenu: null });
        this.stopPlayback();""",
        1,
    )
    logic = logic.replace(' this.updateReferenceState({ lkMenu: st.lkMenu === from ? null : from }); return;', ' return;', 1)
    logic = logic.replace('this.updateReferenceState({ si, cur: k, swOpen: false,', 'this.updateReferenceState({ si, cur: k, swOpen: false, lkMenu: null,', 1)
    logic = logic.replace(
        "this.stopPlayback(); this.updateReferenceState({ msel: [] }); } });",
        """this.stopPlayback(); this.updateReferenceState({ msel: [], lkMenu: null }); } });
    this.listen('pointerdown', e => {
      if (this.referenceState.lkMenu != null && !e.target.closest?.('[data-lk], [data-step-context-menu]')) {
        this.updateReferenceState({ lkMenu: null });
      }
    }, true);""",
        1,
    )
    logic = logic.replace("const menu = document.createElement('div'); menu._ghost", "const menu = document.createElement('div'); menu.setAttribute('data-step-context-menu', ''); menu._ghost", 1)
    logic = logic.replace(
        'const mk = s.lkMenu != null ? s.lkMenu : (nb && !(this.lkDrag && this.lkDrag.moved) ? s.cur : null); if (mk',
        'if (mk',
        1,
    )
    logic = logic.replace(
        '    pts.forEach((p, k) => { const e = L.els[k];',
        '    const mk = s.lkMenu;\n    pts.forEach((p, k) => { const e = L.els[k];',
        1,
    )
    logic = between(logic, '    if (mk != null && pts[mk] && inF(mk))', '\n', '''    if (mk != null && pts[mk] && inF(mk)) {
      const [x, y] = pts[mk].c;
      L.menu.style.display = 'flex';
      const width = L.menu.offsetWidth;
      const left = x + 42 + width <= W - 8 ? x + 42 : Math.max(8, x - 42 - width);
      L.menu.style.transform = 'translate(' + left + 'px,' + y + 'px) translateY(-50%)';
    } else L.menu.style.display = 'none';''')
    logic = logic.replace(
        "lab.textContent = this.lkKo(x) + ' ×' + (x.q || 1);",
        "lab.textContent = this.lkKo(x) + ' ×' + (x.q || 1); lab.setAttribute('data-step-label', k); c.title = lab.textContent + ' · 우클릭하여 단계 편집';",
        1,
    )
    logic = logic.replace('font-size:13px;white-space:nowrap;pointer-events:none;display:none', 'font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;box-sizing:border-box;pointer-events:none;display:none', 1)
    logic = logic.replace(
        'const show = fOn || (nb && !far(k)) || this.lkHov === k || bad || head || (this.lkDrag && this.lkDrag.from === k);',
        'const show = k !== s.cur && k !== mk && (fOn || (nb && !far(k)) || hovered || bad || head || dragMe);',
        1,
    )
    logic = logic.replace(
        'const left = !nb && (fOn || p.c[0] < mc[0]); e.lab.style.transform',
        "const left = !nb && (fOn || p.c[0] < mc[0]); e.lab.style.maxWidth = Math.max(0, Math.min(280, (left ? p.c[0] : W - p.c[0]) - 36)) + 'px'; e.lab.style.transform",
        1,
    )
    return logic


def adapt_sequence_review(logic):
    logic = logic.replace('  lkLoop() {', '''  layoutSequenceReview(points, order, width, height) {
    if (!order.length || !width || !height) return 1;
    const inset = Math.min(34, width / 4, height / 4);
    const w = width - inset * 2, h = height - inset * 2;
    const gap = Math.min(56, Math.sqrt(w * h / order.length));
    const columns = Math.floor(w / gap) + 1, rows = Math.floor(h / gap) + 1;
    const slots = [];
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < columns; col++) {
        slots.push([(width + (2 * col - columns + 1) * gap) / 2, (height + (2 * row - rows + 1) * gap) / 2]);
      }
    }
    for (const k of order) {
      const [x, y] = points[k].c;
      let nearest = 0, distance = Infinity;
      slots.forEach(([sx, sy], i) => {
        const delta = (x - sx) ** 2 + (y - sy) ** 2;
        if (delta < distance) { distance = delta; nearest = i; }
      });
      points[k].c = slots.splice(nearest, 1)[0];
    }
    return Math.min(1, gap / 46);
  }
  lkLoop() {''', 1)
    logic = logic.replace('const nb = !s.lk;', 'const overview = !!s.sequenceReview && !s.tm, nb = !s.lk && !overview;', 1)
    logic = logic.replace('    pts.forEach((p, k) => { let g = 0;', '''    if (overview && this._sequenceGraph?.arr !== arr) {
      const order = arr.flatMap((step, k) => step.del ? [] : [k]);
      const next = new Map(order.slice(0, -1).map((k, i) => [k, order[i + 1]]));
      this._sequenceGraph = { arr, order, next };
    }
    const graph = overview ? this._sequenceGraph : null;
    const reviewChecks = graph ? this.activeSequenceReview(s)?.checks : null;
    const badgeScale = graph ? this.layoutSequenceReview(pts, graph.order, W, H) : 1;
    if (!overview) pts.forEach((p, k) => { let g = 0;''', 1)
    logic = logic.replace('fOn = !!s.lkFocusOn, inF = k => nb ?', 'fOn = !overview && !!s.lkFocusOn, inF = k => overview ? !!arr[k] && !arr[k].del : nb ?', 1)
    logic = logic.replace('    if (nb || s.lkFocusOn) {', '''    if (nb) {
      const group = arr.map((_, k) => k).filter(k => subs0[k] === subs0[s.cur]);
      const active = Math.max(0, group.indexOf(s.cur));
      const reach = Math.max(active, group.length - 1 - active, 1);
      const gap = Math.max(44, Math.min(76, (H / 2 - 26) / reach));
      this._lkSlots = {};
      group.forEach((k, i) => {
        pts[k].c = [64, H / 2 + (i - active) * gap];
        this._lkSlots[k] = pts[k].c.slice();
      });
    } else if (!overview && s.lkFocusOn) {''', 1)
    logic = logic.replace('nb ? subs0[k] === subs0[s.cur] : subs0[k] === s.lkFocus', 'subs0[k] === s.lkFocus', 1)
    logic = logic.replace('nb ? Math.max(30, Math.min(76, (H - 120) / Math.max(1, G.length - 1))) : ', '', 1)
    logic = logic.replace('x0 = nb ? 64 : ', 'x0 = ', 1)
    logic = logic.replace('(Math.abs(k - s.cur) <= 1 || hovered)', '(overview || Math.abs(k - s.cur) <= 1 || hovered)', 1)
    logic = logic.replace('this.lkLeaderPoint(arr[k], future,', 'this.lkLeaderPoint(arr[k], future && !overview,', 1)
    logic = logic.replace('bad = k === s.lkBad, imp =', 'bad = graph ? reviewChecks?.[k]?.ok === false : k === s.lkBad, review = reviewChecks?.[k]?.review, imp =', 1)
    logic = logic.replace("col = bad ? R : k === fl ? M : (fOn || nb) ? O", "col = bad ? R : review ? Y : k === fl ? M : (fOn || nb || overview) ? O", 1)
    logic = logic.replace('(nb && k === s.cur);', '((nb || overview) && k === s.cur);', 1)
    logic = logic.replace("(bad ? ' translateX('", "(bad && !overview ? ' translateX('", 1)
    logic = logic.replace("(head ? (nb && k === s.cur ? ' scale(1.4)' : ' scale(1.25)') : '')", "(overview ? ' scale(' + (head ? 1.25 * badgeScale : badgeScale) + ')' : head ? (nb && k === s.cur ? ' scale(1.4)' : ' scale(1.25)') : '')", 1)
    logic = logic.replace("opacity = primary ? '.9' : '.42';", "opacity = primary ? '.9' : overview ? '.26' : '.42';", 1)
    logic = logic.replace('|| hovered || bad || head || dragMe);', '|| hovered || (!overview && bad) || head || dragMe);', 1)
    logic = logic.replace('n = inV ? (VN[k] ? { c: VN[k] } : null) : pts[k + 1];', 'next = overview ? graph.next.get(k) : k + 1, n = inV ? (VN[k] ? { c: VN[k] } : null) : pts[next];', 1)
    logic = logic.replace('inF(k + 1) && (!fOn || subs[k + 1] === subs[k])', 'inF(next) && (!fOn || subs[next] === subs[k])', 1)
    logic = logic.replace('const cross = subs[k + 1] !== subs[k];', 'const cross = subs[next] !== subs[k];', 1)
    logic = logic.replace("e.seg.setAttribute('stroke', segBad ? R :", "e.seg.setAttribute('stroke', overview ? 'rgba(243,115,33,.75)' : segBad ? R :", 1)
    logic = logic.replace('s.lkMenu : s.lkBad >= 0 ? s.lkBad : nb ? s.cur : null;', 's.lkMenu : overview ? s.cur : s.lkBad >= 0 ? s.lkBad : nb ? s.cur : null;', 1)
    logic = logic.replace("svg.appendChild(path);", "path.setAttribute('data-step-sequence-links', ''); svg.appendChild(path);", 1)
    logic = logic.replace('done = on && i < s.cur,', 'done = !s.sequenceReview && on && i < s.cur,', 1)
    logic = logic.replace('        this.stopPlayback(); const r = root.getBoundingClientRect()', '''        if (this.referenceState.sequenceReview) { this.pick(this.referenceState.si, k, false); return; }
        this.stopPlayback(); const r = root.getBoundingClientRect()''', 1)
    logic = logic.replace('    this.tmGo(!!this.props.tools);', '    this.closeSequenceReview();\n    this.tmGo(!!this.props.tools);', 1)
    return logic


def adapt_step_actions(logic):
    logic = logic.replace('  initPlan() {', '''  stepActionVals(s, step) {
    if (s.tm || !step || step.blank || step.del) return { actionPanel: false };
    const source = this.pr.parts[step.part]?.actionSource;
    const labels = {
      library: '라이브러리 기준 · 도면의 실제 작업에 맞게 바꿀 수 있습니다.',
      geometry: '같은 조립 형상에서 확인한 유형을 적용했습니다.',
      name: '부품명 기준 초안 · 실제 작업을 확인하세요.',
      unmatched: '분류 근거 없음 · 도면에서 작업 유형을 확인하세요.'
    };
    const label = step.actionOverride ? '작업자가 확인한 유형' : labels[source] || '조립 초안 기준';
    return {
      actionPanel: true, actionSource: label,
      actionTitle: '조립 유형 수정 · ' + (step.t === 'fasten' ? '체결' : '놓기'),
      actionExpanded: !step.actionOverride && source === 'unmatched',
      actionChoices: [['place', '놓기'], ['fasten', '체결']].map(([action, label]) => ({
        label, selected: step.t === action, border: step.t === action ? '#cf7c43' : '#38444d',
        bg: step.t === action ? '#4a2c1c' : '#1b2329', go: () => this.chooseStepAction(action)
      })),
      actionFollowup: step.t === 'place', addFollowup: () => this.addFollowupFastening()
    };
  }
  chooseStepAction(action) {
    const s = this.referenceState, step = s.plan?.[s.si]?.[s.cur];
    if (s.tm || !step || step.blank || step.del || step.actionOverride === action) return;
    if (this.activePositionEdit(s)) { this.say('위치를 적용하거나 취소한 뒤 유형을 바꾸세요'); return; }
    const typeChanged = step.t !== action, label = action === 'fasten' ? '체결' : '놓기';
    this.setPlan(rows => {
      const row = rows[s.cur];
      row.actionOverride = action;
      if (!typeChanged) return;
      row.t = action;
      row.g = this.lkKo(row) + (action === 'fasten' ? '의 체결 위치와 공구를 확인하세요.' : '을(를) 조립 위치에 놓으세요.');
      delete row.tool; delete row.toolK; delete row.toolOk;
      delete row.nm; delete row.nmEd; delete row.nmSrc;
      delete row.contactReview;
    }, label + ' 유형으로 확인했습니다');
    clearTimeout(this._as);
    this.autoSave();
  }
  addFollowupFastening() {
    const s = this.referenceState, step = s.plan?.[s.si]?.[s.cur];
    if (s.tm || !step || step.t !== 'place' || step.del || step.blank) return;
    if (this.activePositionEdit(s)) { this.say('위치를 적용하거나 취소한 뒤 체결 단계를 추가하세요'); return; }
    const at = s.cur + 1, pcs = this.lkPcs(step, s.si);
    this.setPlan(rows => {
      rows.splice(at, 0, {
        part: step.part, t: 'fasten', actionOverride: 'fasten', extraAction: true, isNew: true,
        sub: step.sub, pcs: pcs.slice(), q: step.q,
        g: this.lkKo(step) + '의 체결 위치와 공구를 확인하세요.'
      });
    }, '후속 체결 단계를 추가했습니다 · 실제 작업 위치로 옮기세요');
    this.pick(s.si, at, false);
    clearTimeout(this._as);
    this.autoSave();
  }
  initPlan() {''', 1)
    logic = logic.replace('...this.positionEditorVals(s, cur),', '...this.stepActionVals(s, cur), ...this.positionEditorVals(s, cur),', 1)
    return logic


def adapt_integrated_tools(logic):
    logic = between(logic, '  TL = ', '  boltOf(x)', '  TL = FLOW_FASTENING_TOOLS;\n')
    logic = between(logic, '  tmGo(on)', '  toolGeo(t)', '''  fasteningSteps(s = this.referenceState) {
    return (s.plan || []).flatMap((rows, si) => rows.flatMap((step, k) => step.t === 'fasten' && !step.del && !step.blank ? [[si, k, step]] : []));
  }
  openToolReview(current = false) {
    const s = this.referenceState, steps = this.fasteningSteps(s);
    const selected = steps.find(([si, k]) => si === s.si && k === s.cur);
    const target = (current && selected) || steps.find(([, , step]) => !step.toolOk) || selected || steps[0];
    if (!target) return;
    if (this.activePositionEdit(s)) { this.say('위치를 적용하거나 취소한 뒤 공구를 검토하세요'); return; }
    const [si, k] = target, sub = this.lkSubs(s.plan[si])[k];
    this.updateReferenceState({ tab: 'tools', open: { ...s.open, [si]: true }, subCl: { ...s.subCl, [si + '-' + sub]: false } });
    this.pick(si, k, s.si !== si);
    if (!this._tlTh) { this._tlTh = true; this.delay(() => this.toolThumbs(), 100); }
  }
  changeStepTab(tab, swap = false) {
    const focused = this.referenceState.toolFocus;
    this.closePositionEdit();
    this.updateReferenceState({ tab, toolFocus: false, swOpen: swap }, () => this.show(!!focused, false));
  }
  focusFastener() {
    const s = this.referenceState, E = this.E, T = window.THREE;
    const step = s.plan?.[s.si]?.[s.cur];
    if (!E || !s.toolFocus || !step || step.t !== 'fasten') return;
    const piece = this.pr.pieces[this.lkPcs(step, s.si)[0]];
    if (!piece) return;
    piece.obj.updateMatrixWorld(true);
    const bounds = new T.Box3().setFromObject(piece.obj);
    if (bounds.isEmpty()) return;
    const radius = bounds.getSize(new T.Vector3()).length();
    const distance = Math.max(radius * 3.4, E.sz * .045, 8);
    E.cam.near = Math.min(10, distance / 50);
    E.cam.updateProjectionMatrix();
    E.orbit({ az: E.orbT.az, el: E.orbT.el, dist: distance, tgt: bounds.getCenter(new T.Vector3()) });
  }
  toggleToolFocus() {
    const s = this.referenceState;
    if (s.sequenceReview || !s.plan?.[s.si]?.[s.cur] || s.plan[s.si][s.cur].t !== 'fasten') return;
    const on = !s.toolFocus;
    this.stopPlayback();
    this.updateReferenceState({ toolFocus: on }, () => {
      this.show(!on, false);
      if (on) this.focusFastener();
    });
  }
  setToolAt(pairs, key, msg) {
    if (this.activePositionEdit(this.referenceState)) return;
    this.setPlan((_, plan) => {
      for (const [si, k] of pairs) {
        const row = plan[si]?.[k];
        if (!row || row.t !== 'fasten' || row.del || row.blank) continue;
        const tool = findFlowFasteningTool(key || this.toolK(row));
        if (!tool) continue;
        row.tool = tool.ko;
        row.toolK = tool.k;
        row.toolOk = true;
      }
    }, msg);
  }
  saveToolTorque() {
    const s = this.referenceState, draft = s.torqueDraft;
    if (!draft) return;
    this.updateReferenceState({ torqueDraft: null });
    const value = draft.text.trim().replace(',', '.');
    const torque = value === '' ? null : Number(value);
    if (torque !== null && (!/^\\d*(?:\\.\\d+)?$/.test(value) || !Number.isFinite(torque) || torque <= 0)) {
      this.say('토크는 0보다 큰 숫자로 입력하세요');
      return;
    }
    const row = s.plan?.[draft.si]?.[draft.k];
    if (!row || row.t !== 'fasten' || row.del || row.blank) return;
    this.setPlan((_, plan) => { Object.assign(plan[draft.si][draft.k], { nm: torque, nmEd: true }); });
    clearTimeout(this._as);
    this.autoSave();
  }
''')
    logic = logic.replace("if (/십자/.test(ty)) return 'ph2';", "if (/\\btorx\\b/i.test(ty.replace(/_/g, ' '))) return 'torx0'; if (/십자|phillips/i.test(ty)) return 'ph2';", 1)
    logic = logic.replace("    else { add(cyl(2.4, 60)", '''    else if (t.f === 'torx') {
      const tip = new T.Shape();
      for (let k = 0; k < 12; k++) {
        const a = k * Math.PI / 6, r = k % 2 ? 1.45 : 2.15;
        tip[k === 0 ? 'moveTo' : 'lineTo'](Math.cos(a) * r, Math.sin(a) * r);
      }
      tip.closePath();
      add(new T.ExtrudeGeometry(tip, { depth: 6, bevelEnabled: false }), st, 0, 6, 0, H);
      add(cyl(2.4, 22, 6), st, 0, 17, 0);
      add(cyl(4.8, 20), gr, 0, 36, 0);
    }
    else { add(cyl(2.4, 60)''', 1)
    logic = logic.replace("const t = this.TL.find(t => t.ko === x.tool || t.k === x.toolK);", "const t = findFlowFasteningTool(x.toolK, x.tool || x.toolKo);", 1)
    logic = logic.replace('tm: !!this.props.tools,', 'tm: false,', 1)
    logic = between(logic, '  componentDidUpdate(prevProps)', '  mountReference()', '''  componentDidUpdate(prevProps) {
    if (prevProps.tools !== this.props.tools && this.props.tools && this.E) this.openToolReview();
  }
''')
    logic = logic.replace('if (this.referenceState.tm) this.delay(() => this.tmGo(true), 200);', 'if (this.props.tools) this.delay(() => this.openToolReview(), 200);', 1)
    logic = logic.replace('    this.props.session.readSteps = undefined;', '    this.clearToolPreview();\n    this._tmOut?.dispose();\n    this.props.session.readSteps = undefined;', 1)
    logic = logic.replace('  tm3d() { const E = this.E, T = window.THREE, s = this.referenceState; if (!E || !T) return; if (this._tmG) { E.S.remove(this._tmG); this._tmG = null; } if (!s.tm || !s.plan) return;', '''  clearToolPreview() {
    if (!this._tmG) return;
    this._tmG.removeFromParent();
    this._tmG.traverse(node => node.geometry?.dispose());
    this._tmG = null;
  }
  tm3d() { const E = this.E, T = window.THREE, s = this.referenceState; if (!E || !T) return;
    this.clearToolPreview();
    if (!s.toolFocus || s.sequenceReview || !s.plan) return;''', 1)
    logic = logic.replace("x.t !== 'fasten' || !x.pcs || !x.pcs.length) return; const pc = this.pr.pieces[x.pcs[0]];", "x.t !== 'fasten' || x.del) return; const pc = this.pr.pieces[this.lkPcs(x, s.si)[0]];", 1)
    logic = logic.replace('hm = new T.Vector3(pc.home.x, pc.home.y, pc.home.z), cc = c.clone().sub(wp).add(hm)', 'hm = wp, cc = c', 1)
    logic = logic.replace('g.add(inner);\n    const om', "g.add(inner);\n    g.scale.setScalar(Math.min(1, Math.max(.025, sz.length() / 38)));\n    const om", 1)
    logic = logic.replace('    const preview = s.tm ? s.ghost : s.showFuture;', '''    const preview = s.tm ? s.ghost : s.showFuture;
    const focusStep = plan[k];
    const focusIndex = s.toolFocus && !s.sequenceReview && focusStep?.t === 'fasten' && !focusStep.del ? this.lkPcs(focusStep, si)[0] : undefined;
    const nearby = focusIndex == null ? null : this.lkB(focusIndex).clone();
    if (nearby) nearby.expandByScalar(nearby.getSize(new T.Vector3()).length() * 1.25);''', 1)
    logic = logic.replace("wire = s.tm && s.look === 'wire';", "wire = s.tab === 'tools' && plan[k]?.t === 'fasten' && s.look === 'wire';", 1)
    logic = logic.replace('t.dist = Math.max(z * 0.2,', 't.dist = Math.max(this.referenceState.toolFocus ? Math.max(.25, E.cam.near * 4) : z * 0.2,', 1)
    logic = logic.replace('    E.grid.material.opacity = wire ? 0.32 : 0.25;', '''    if (!s.toolFocus && E.cam.near !== 10) { E.cam.near = 10; E.cam.updateProjectionMatrix(); }
    E.grid.material.opacity = wire ? 0.32 : 0.25;''', 1)
    logic = logic.replace('      if (j > k && !s.sequenceReview) {', '''      if (nearby && !selected.has(i)) {
        if (nearby.intersectsBox(this.lkB(i))) {
          this.paintStepEdges(pc, materials.preview, true);
          pc.wireM.visible = true;
        }
        return;
      }
      if (j > k && !s.sequenceReview) {''', 1)
    logic = logic.replace('    this.updateReferenceState({ si, cur: k, swOpen: false, lkMenu: null,', '''    const next = this.referenceState.plan?.[si]?.[k];
    const canKeepTools = next?.t === 'fasten' && !next.del && !next.blank;
    const resetFocus = this.referenceState.toolFocus && (!canKeepTools || fromPlayback);
    this.updateReferenceState({ si, cur: k, swOpen: false, lkMenu: null,
      ...(resetFocus ? { toolFocus: false } : {}),
      ...(!canKeepTools && this.referenceState.tab === 'tools' ? { tab: 'det' } : {}),''', 1)
    logic = logic.replace('...(clearReport ? { lkMsg: null, lkBad: -1 } : {}) }, () => this.show(fit));', '''...(clearReport ? { lkMsg: null, lkBad: -1 } : {}) }, () => {
      const focused = this.referenceState.toolFocus;
      this.show(!focused && (fit || resetFocus), !focused);
      if (focused && selectionChanged) this.focusFastener();
    });''', 1)
    logic = logic.replace('sequenceReview: true, lk: false,', 'sequenceReview: true, toolFocus: false, lk: false,', 1)
    logic = logic.replace("goNext: () => { this.tidy(true); this.toPage(22); }", "goNext: () => { this.tidy(true); this.toPage(23); }", 1)
    logic = logic.replace("const PG = ['파일 올리기', '부품 확인', '조립도', '조립 순서', '체결 · 공구', '구멍 위치', '설계도 · PDF', '완료'];", "const PG = ['파일 올리기', '부품 확인', '조립도', '조립 순서', '구멍 위치', '설계도 · PDF', '완료'];", 1)
    logic = logic.replace('[-1, 3, 20, 21, 22, 23, 24, 2]', '[-1, 3, 20, 21, 23, 24, 2]', 1)
    logic = logic.replace("tabs: [['det', '단계 상세'], ['lib', '부품 라이브러리']].map", "tabs: [['det', '단계 상세'], ['lib', '부품 라이브러리'], ...(toolReady ? [['tools', '도구 라이브러리']] : [])].map", 1)
    logic = logic.replace("go: () => { if (k !== s.tab) { this.closePositionEdit(); this.updateReferenceState({ tab: k }); } }", "go: () => { if (k !== s.tab) { if (k === 'tools') this.openToolReview(true); else this.changeStepTab(k); } }", 1)
    logic = logic.replace("tabDet: s.tab === 'det', tabLib: s.tab === 'lib',", "tabDet: s.tab === 'det' || (s.tab === 'tools' && !toolReady), tabLib: s.tab === 'lib', showStepChat: !toolPanel, toolPanel,\n      canReviewTools: this.fasteningSteps(s).length > 0, openToolReview: () => this.openToolReview(), toolReviewBg: toolPanel ? '#2a3238' : 'transparent',", 1)
    logic = logic.replace("    const snapshot = this.activeSequenceReview(s), checks", "    const toolReady = cur?.t === 'fasten' && !cur.del && !cur.blank, toolPanel = toolReady && s.tab === 'tools';\n    const snapshot = this.activeSequenceReview(s), checks", 1)
    logic = logic.replace("if (!tm || !s.plan) return base;", "if (s.tab !== 'tools' || !s.plan) return base;", 1)
    logic = logic.replace("const all = []; s.plan.forEach((a, gi) => a.forEach((x, i) => { if (x.t === 'fasten' && !x.del) all.push([gi, i, x]); }));", "const all = this.fasteningSteps(s);", 1)
    logic = logic.replace("    const cands = this.TL.filter(t => t.k === rec || t.f === 'torque' || (t.f === fam && t.f !== 'torque' && t.f !== 'ph')).sort", "    const query = (s.toolQuery || '').trim().toLowerCase();\n    const cands = this.TL.filter(t => query ? (t.ko + ' ' + t.k).toLowerCase().includes(query) : s.allTools || t.k === ck || t.k === rec || t.f === 'torque' || t.f === fam).sort", 1)
    logic = logic.replace("return Object.assign(base, { tmSel: true,", "return Object.assign(base, { tmSel: true, toolQuery: s.toolQuery || '', searchTools: e => this.updateReferenceState({ toolQuery: e.target.value }),\n      allToolsLabel: s.allTools ? '추천 도구' : '전체 도구', toggleAllTools: () => this.updateReferenceState({ allTools: !s.allTools, toolQuery: '' }), noToolsFound: !cands.length,\n      toolFocused: !!s.toolFocus, toolFocusDisabled: !!s.sequenceReview, toolFocusLabel: s.toolFocus ? '전체 조립 보기' : '체결부 확대', toggleToolFocus: () => this.toggleToolFocus(), openFastenerParts: () => this.changeStepTab('det', true),", 1)
    logic = logic.replace("'크기 다름', tc:", "'규격 확인', tc:", 1)
    logic = logic.replace("bo.nm + '에는 ' + this.TL.find(t => t.k === rec).ko + '가 맞습니다. 지금 고른 ' + ct.ko + '로는 체결할 수 없습니다.'", "'추천 공구는 ' + this.TL.find(t => t.k === rec).ko + '입니다. 선택한 ' + ct.ko + '의 구동 홈과 규격을 확인하세요.'", 1)
    logic = logic.replace("tqv = cur.nm != null && cur.nm !== '' ? cur.nm : this.TQ[m2];", "sampleTorque = this.pr.key === 'shaper-reference' ? this.TQ[m2] : undefined, tqv = cur.nmEd || cur.nm != null ? cur.nm : sampleTorque;", 1)
    logic = logic.replace("tmNm: tqv == null ? '' : String(tqv),", "tmNm: s.torqueDraft?.si === s.si && s.torqueDraft?.k === s.cur ? s.torqueDraft.text : tqv == null ? '' : String(tqv),", 1)
    logic = between(logic, '      tmNmIn: e => {', '      tmTools:', '''      tmNmIn: e => this.updateReferenceState({ torqueDraft: { si: s.si, k: s.cur, text: e.target.value } }),
      tmNmBlur: () => this.saveToolTorque(),
      tmNmKey: e => { if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur(); } },
''')
    logic = logic.replace("m2 && this.TQ[m2] ? '규격 표준값 · 강도 8.8 기준'", "sampleTorque ? '시연 규격 예시값'", 1)
    return logic


def adapt_advisory_validation(logic):
    logic = logic.replace('  activeSequenceReview(s = this.referenceState) {', '''  cancelSequenceAdvice() {
    this._sequenceAdviceJob?.abort();
    this._sequenceAdviceJob = null;
  }
  async requestSequenceAdvice(snapshot) {
    this.cancelSequenceAdvice();
    const job = this._sequenceAdviceJob = new AbortController();
    const active = snapshot.rows.flatMap((row, index) => row.del ? [] : [{
      index, number: this.lbl(snapshot.rows, index), part: this.lkKo(row).slice(0, 120),
      operation: row.t === 'fasten' ? '체결' : '놓기', finding: (snapshot.checks[index]?.msg || '').slice(0, 260)
    }]);
    const rows = active.length <= 96 ? active : [...active.filter(row => row.finding), ...active.filter(row => !row.finding)]
      .slice(0, 96).sort((a, b) => a.index - b.index);
    this.updateReferenceState({ sequenceAdvice: { status: 'pending', items: [], count: rows.length, total: active.length } });
    let result;
    try {
      const response = await fetch('/api/drawing/assembly-review', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows }), signal: job.signal
      });
      if (response.ok) result = await response.json();
    } catch {}
    if (this._sequenceAdviceJob !== job || !this.activeSequenceReview()) return;
    this._sequenceAdviceJob = null;
    const items = result?.available && Array.isArray(result.items) ? result.items : [];
    this.updateReferenceState({ sequenceAdvice: { status: result?.available ? 'ready' : 'unavailable', items, count: rows.length, total: active.length } });
  }
  activeSequenceReview(s = this.referenceState) {''', 1)
    logic = logic.replace('sequenceReview: false, reviewSnapshot: null, reviewBatchOpen: false,', 'sequenceReview: false, reviewSnapshot: null, reviewBatchOpen: false, sequenceAdvice: null,', 2)
    logic = logic.replace('  unmountReference() {', '  unmountReference() {\n    this.cancelSequenceAdvice();', 1)
    logic = logic.replace('  undo() { this.stopPlayback(); if (!this.H.length) return;', '  undo() { this.stopPlayback(); if (!this.H.length) return; this.discardSequenceReview();', 1)
    logic = logic.replace('  reflow() { if (!this.pr || !this.E) return;', '  reflow() { if (!this.pr || !this.E) return; this.discardSequenceReview();', 1)
    logic = logic.replace('  pick(si, k, fit, fromPlayback = false) { if (!fromPlayback) this.stopPlayback();', '''  pick(si, k, fit, fromPlayback = false) {
    if (!fromPlayback) this.stopPlayback();
    if (si !== this.referenceState.si) {
      this.discardSequenceReview();
      if (this.referenceState.confirmed) this.updateReferenceState({ confirmed: false, lkMsg: null });
    }''', 1)
    logic = between(logic, 'lkLocal(k) {', '  stepLineMaterials() {', '''lkLocal(k) {
    this.updateReferenceState({ lkFlash: { k, t: performance.now() } });
  }
''')
    logic = between(logic, '  lkLink(a, b2) {', '  lkBuild() {', '''  lkLink(a, b2) {
    const to = b2 > a ? a + 1 : a;
    if (to === b2) return;
    this.move(b2, to);
    this.lkLocal(to);
  }
''')
    logic = between(logic, '  lkPlay(res, done, back) {', '  lkLink(a, b2) {', '')
    logic = between(logic, '  warns(arr,', '  lbl(arr, i)', '')
    logic = between(logic, '  tidy(silent) {', '  aiSort(arr, from)', '''  tidy(silent) {
    const { si, cur, plan } = this.referenceState, arr = plan[si];
    if (!arr) return;
    const n = this.tidyN(arr);
    if (!n.a && !n.d) return;
    const next = Math.max(0, Math.min(arr.length - n.d - 1, arr.slice(0, cur).filter(step => !step.del).length));
    this.setPlan(rows => rows.filter(step => !step.del).map(step => ({ ...step, isNew: false })),
      silent ? null : '번호를 정리했습니다 · 추가 ' + n.a + ' · 삭제 ' + n.d);
    this.updateReferenceState({ cur: next, lkMsg: null }, () => this.show(false));
  }
''')
    logic = between(logic, '      lkAll:', '      lkMsgOn:', '      lkAll: () => this.openSequenceReview(arr),\n')
    logic = between(logic, '    const W = this.warns(arr),', '    const rf =', '''    const W = Object.fromEntries(issues.map(i => [i, checks[i].msg])), wN = issues.length;
    const total = plan ? plan.reduce((sum, rows) => sum + rows.length, 0) : 0;
    const advice = snapshot ? s.sequenceAdvice : null;
''')
    logic = logic.replace('      issueOn: issues.length > 0, issueOff: issues.length === 0,', '''      issueOn: issues.length > 0, issueOff: issues.length === 0,
      sequenceAdviceOn: !!advice,
      sequenceAdviceText: advice?.status === 'pending' ? '단계 순서와 형상 검토 결과를 확인 중입니다.'
        : advice?.status === 'unavailable' ? '로컬 Qwen에 연결되지 않았습니다. 형상 검토 결과를 확인할 수 있습니다.'
          : (advice?.count < advice?.total ? advice.count + '/' + advice.total + '단계 요약 · ' : '') + (advice?.items.length ? '참고 의견 ' + advice.items.length + '건' : '추가 의견 없음'),
      sequenceAdviceRows: (advice?.items || []).flatMap(item => arr[item.index] ? [{
        label: this.lbl(arr, item.index) + '번 · ' + this.lkKo(arr[item.index]), reason: item.reason,
        go: () => this.pick(s.si, item.index, false)
      }] : []),''', 1)
    return logic


def adapt_assembly_diagram(logic):
    logic = logic.replace('  explode(si) {', '''  explode(si, diagram = false) {''', 1)
    logic = logic.replace('if (!this._ex) this._ex = {}; if (this._ex[si]) return this._ex[si];', "if (!this._ex) this._ex = {}; const key = si + ':' + diagram; if (this._ex[key]) return this._ex[key];", 1)
    logic = logic.replace('idx = sec.idx.slice().sort((a, b) =>', 'idx = sec.idx.filter(i => !diagram || !this.isLink(i)).sort((a, b) =>', 1)
    logic = logic.replace('return (this._ex[si] = { keys, byKey, pos, span });', 'return (this._ex[key] = { keys, byKey, pos, span });', 1)
    logic = logic.replace('  drawSet(v, still) {', '''  drawSet(v, still) {
    if (!still && (this._scN ?? this.referenceState.sc) === 20) { this.drawDiagram(v); return; }
    this.clearDiagramLinks();''', 1)
    logic = between(logic, '  grpLinks() {', '  cntTxt(idx)', '''  isLink(i) { const part = this.pr.parts[this.pr.pieces[i].part]; return !!(part?.fastenerPart ?? part?.std); }
  diagramGeometry() {
    const pr = this.pr, geometry = this.getFlowContactGeometry();
    if (!geometry) return { boxes: [], links: [] };
    if (this._diagramGeometry?.project === pr) return this._diagramGeometry;
    const links = pr.pieces.flatMap((_, fastener) => {
      if (!this.isLink(fastener)) return [];
      const [from, to] = geometry.evidence(fastener).targets;
      if (!to) return [];
      const a = from.index, b = to.index;
      return [{ a, b, from: from.point.clone().sub(pr.pieces[a].home), to: to.point.clone().sub(pr.pieces[b].home) }];
    });
    return (this._diagramGeometry = { project: pr, boxes: geometry.boxes, links });
  }
  grpLinks() {
    const pr = this.pr;
    if (!pr) return {};
    if (this._diagramGroups?.sections === pr.sections) return this._diagramGroups.links;
    const { links } = this.diagramGeometry();
    const groups = new Map(), out = {};
    pr.sections.forEach((sec, si) => {
      if (sec.final) return;
      const { of } = this.subData(si);
      sec.idx.forEach(i => groups.set(i, si + '-' + of[i]));
    });
    for (const { a, b } of links) {
      const first = groups.get(a), second = groups.get(b);
      if (first == null || second == null || first === second) continue;
      const left = (out[first] ||= {}), right = (out[second] ||= {});
      left[second] = (left[second] || 0) + 1;
      right[first] = (right[first] || 0) + 1;
    }
    this._diagramGroups = { sections: pr.sections, links: out };
    return out;
  }
  isMerge(nm) { return /합치기|결합/.test(String(nm || '')); }
  placeDiagramParts(positions) {
    const E = this.E, T = window.THREE, pr = this.pr, { boxes } = this.diagramGeometry();
    const floor = E.grid.position.y, offset = new T.Vector3(), bounds = new T.Box3();
    let lowest = Infinity;
    for (const [i, p] of positions) lowest = Math.min(lowest, boxes[i].min.y + p.y - pr.pieces[i].home.y);
    const lift = Math.max(0, floor - lowest);
    E.anim = [];
    pr.pieces.forEach((piece, i) => {
      const p = positions.get(i);
      piece.obj.visible = !!p;
      piece.wireM.visible = false;
      if (!p) return;
      const currentBottom = boxes[i].min.y + piece.obj.position.y - piece.home.y;
      if (currentBottom < floor) {
        const start = piece.obj.position.clone();
        start.y += floor - currentBottom;
        E.snap(piece.obj, start, piece.q);
      }
      const target = p.clone();
      target.y += lift;
      E.move(piece.obj, target, piece.q, 0, 5);
      bounds.union(boxes[i].clone().translate(offset.subVectors(target, piece.home)));
    });
    return bounds;
  }
  drawDiagram(v) {
    const E = this.E, pr = this.pr, section = pr.sections[v];
    const positions = section && !section.final ? this.explode(v, true).pos
      : new Map((section?.idx || pr.pieces.map((_, i) => i)).filter(i => !this.isLink(i)).map(i => [i, pr.pieces[i].home]));
    const bounds = this.placeDiagramParts(positions);
    this.blBot = 30;
    if (!bounds.isEmpty()) this.fitBox(bounds.expandByScalar(E.sz * .1), .3);
    if (section && !section.final) this.blMake = () => this.subBl(v);
    else this.blMake = () => pr.sections.flatMap((sec, si) => {
      const objs = sec.idx.filter(i => positions.has(i)).map(i => pr.pieces[i].obj);
      if (sec.final || !objs.length) return [];
      const live = this.secLive(), col = this.SECC[si % this.SECC.length];
      return [{ txt: live ? String(sec.no).padStart(2, '0') : String(sec.no), sub: sec.ko,
        cnt: this.cntTxt(sec.idx), col, secK: si, objs, onClick: () => this.drawView(si),
        onDbl: live ? () => this.secRenameAt(si) : undefined,
        onHov: live ? on => { this.secHi = on ? si : null; this.secPaint(); } : undefined }];
    });
    this.showDiagramLinks();
  }
  clearDiagramLinks() {
    const E = this.E;
    if (!E) return;
    E.unlab('diagramLinks');
    if (this._diagramLinkFrame) E.hooks = E.hooks.filter(hook => hook !== this._diagramLinkFrame);
    this._diagramLinkFrame = null;
  }
  showDiagramLinks(focus) {
    this.clearDiagramLinks();
    const E = this.E, pr = this.pr, T = window.THREE, { boxes, links } = this.diagramGeometry();
    const visible = links.filter(({ a, b }) => pr.pieces[a].obj.visible && pr.pieces[b].obj.visible && (!focus || focus.has(a) || focus.has(b)));
    if (!visible.length) return;
    const ns = 'http://www.w3.org/2000/svg';
    const svg = E.lab('diagramLinks', '<svg data-diagram-fastener-links="" aria-hidden="true" width="100%" height="100%"></svg>', 'width:100%;height:100%;z-index:1;').firstChild;
    const unique = new Set(), lines = [];
    for (const { a, b, from, to } of visible) {
      const key = Math.min(a, b) + ':' + Math.max(a, b);
      if (unique.has(key)) continue;
      unique.add(key);
      const line = document.createElementNS(ns, 'line');
      line.setAttribute('stroke', '#ffb27a');
      line.setAttribute('stroke-width', focus ? '1.8' : '1.3');
      line.setAttribute('stroke-dasharray', '5 5');
      line.setAttribute('stroke-opacity', focus ? '.9' : '.66');
      svg.appendChild(line);
      const localCenter = i => boxes[i].getCenter(new T.Vector3()).sub(pr.pieces[i].home);
      lines.push({ a, b, line, from, to, centerA: localCenter(a), centerB: localCenter(b) });
    }
    const position = new T.Vector3();
    const project = (i, p) => E.proj(position.copy(p).add(pr.pieces[i].obj.position));
    this._diagramLinkFrame = () => {
      E.cam.updateMatrixWorld();
      for (const { a, b, line, from, to, centerA, centerB } of lines) {
        let A = project(a, from), B = project(b, to);
        if (Math.hypot(A.x - B.x, A.y - B.y) < 3) { A = project(a, centerA); B = project(b, centerB); }
        line.style.display = Math.abs(A.z) <= 1 && Math.abs(B.z) <= 1 && Math.hypot(A.x - B.x, A.y - B.y) >= 3 ? '' : 'none';
        line.setAttribute('x1', A.x); line.setAttribute('y1', A.y);
        line.setAttribute('x2', B.x); line.setAttribute('y2', B.y);
      }
    };
    E.hooks.push(this._diagramLinkFrame);
    this._diagramLinkFrame();
  }
''')
    logic = logic.replace('idx: sec.idx.filter(i => d.of[i] === k) })).filter', 'idx: sec.idx.filter(i => d.of[i] === k && !this.isLink(i)) })).filter', 1)
    logic = logic.replace('const items = pr.pieces.map(pc =>', 'const items = pr.pieces.map((pc, i) =>', 1)
    logic = logic.replace('S.add(g); g.updateMatrixWorld(true); bb.expandByObject(g); return g;', 'g.visible = !this.isLink(i); S.add(g); g.updateMatrixWorld(true); if (g.visible) bb.expandByObject(g); return g;', 1)
    logic = logic.replace('r = Math.max(sz.x, sz.y, sz.z), cam = new T.PerspectiveCamera(30, 4 / 3', 'r = Math.max(sz.x, sz.y, sz.z, 1), cam = new T.PerspectiveCamera(30, 4 / 3', 1)
    logic = between(logic, '  lkClear() {', '  linkWarn(', '''  lkClear() { this.clearDiagramLinks(); }
  subFocus(k) {
    const pr = this.pr, si = this.referenceState.dv, E = this.E, T = window.THREE;
    if (si == null || si < 0 || !E) return;
    const { of } = this.subData(si), ex = this.explode(si, true);
    const own = [...ex.pos.keys()].filter(i => of[i] === k);
    if (!own.length) return;
    this.unBalloons();
    const focus = new Set(own), center = new T.Vector3();
    own.forEach(i => center.add(ex.pos.get(i)));
    center.multiplyScalar(1 / own.length);
    const positions = new Map(own.map(i => [i, ex.pos.get(i).clone().sub(center).multiplyScalar(1.35).add(center)]));
    for (const { a, b } of this.diagramGeometry().links) {
      const other = focus.has(a) ? b : focus.has(b) ? a : null;
      if (other != null && !positions.has(other)) positions.set(other, ex.pos.get(other) || pr.pieces[other].home);
    }
    const bounds = this.placeDiagramParts(positions);
    if (!bounds.isEmpty()) this.fitBox(bounds.expandByScalar(E.sz * .06), .3);
    const groups = new Map();
    own.forEach(i => {
      const part = pr.pieces[i].part;
      if (!groups.has(part)) groups.set(part, []);
      groups.get(part).push(pr.pieces[i].obj);
    });
    this.blMake = this.blMake0 = () => [...groups].map(([part, objs], i) => ({
      chip: true, col: '#c3cbd0', txt: String(i + 1).padStart(2, '0'), sub: this.pKo(part),
      cnt: objs.length > 1 ? '×' + objs.length : '', objs, onClick: () => {}
    }));
    this.updateReferenceState({ subF: k }, () => { this.balloons(this.blMake()); this.secPaint(); });
    this.showDiagramLinks(focus);
  }
''')
    logic = between(logic, '  linkWarn(', '  drawView(', '''  linkWarn(idxs, dst, toSub) {
    const pr = this.pr, moved = new Set(idxs), group = this.subData(dst).of, inDestination = new Set(pr.sections[dst].idx);
    const hits = this.diagramGeometry().links.filter(({ a, b }) => moved.has(a) !== moved.has(b) &&
      !(inDestination.has(moved.has(a) ? b : a) && group[moved.has(a) ? b : a] === toSub));
    if (!hits.length) return '';
    const { a, b } = hits[0];
    return this.pKo(pr.pieces[a].part) + '와(과) ' + this.pKo(pr.pieces[b].part) + '의 체결 연결을 확인하세요.';
  }
''')
    logic = logic.replace('  go(sc) { this.secHi = null;', '  go(sc) { this.clearDiagramLinks(); this.secHi = null;', 1)
    logic = logic.replace('if (!this.snaps) await this.makeSnaps();', 'if (this.referenceState.sc === 24 && !this.snaps) await this.makeSnaps();', 1)
    logic = logic.replace('if (this.subLive()) { this.blMake = () => this.subBl();', 'if (this.subLive() && this.referenceState.subF == null) { this.blMake = () => this.subBl();', 1)
    logic = logic.replace('go: () => { const f = () => this.subFocus(k); if (this.referenceState.dv !== si) { this.drawView(si); this.delay(f, 320); } else f(); }',
                          'go: () => { if (this.referenceState.dv !== si) this.drawView(si); this.subFocus(k); }', 1)
    return logic


def adapt_drawing(logic, name):
    logic = logic.replace(' extends PortedLogic', ' extends FlowLogic')
    logic = re.sub(r"'(dx7_[a-z0-9_]+)'", r"this.flowKey('\1')", logic)
    if name == 'DrawingFlowSteps':
        logic = logic.replace('ghost: false, hist:', 'ghost: false, showFuture: true, hist:', 1)
        logic = logic.replace("return v != null ? 'hex' + v : 'torque';",
                              "return v != null ? 'hex' + v : this.TL.find(t => t.f === 'torque').k;")
        logic = between(logic, '      const rows = fresh.map((x, fi)', '      flat.filter(o => o.si === si && o.x.isNew)', '''      const rows = fresh.map((x, fi) => {
        const sb = subOfStep(x), y = { ...x };
        const samePieces = step => x.pcs && step.pcs?.length === x.pcs.length && step.pcs.every(i => x.pcs.includes(i));
        const findRow = predicate => {
          const matches = o => o.x.part === x.part && !o.x.isNew && !o.x.extraAction && !o.used && predicate(o.x);
          const exact = flat.find(o => matches(o) && o.si === si && samePieces(o.x));
          if (exact) return exact;
          return flat.find(o => matches(o) && o.si === si && o.x.sub === sb)
            || flat.find(o => matches(o) && o.si === si) || flat.find(matches);
        };
        const manual = findRow(step => (step.actionOverride === 'place' || step.actionOverride === 'fasten')
          && (!x.pcs || !step.pcs || samePieces(step)));
        const sameType = manual || findRow(step => (step.t || 'place') === (x.t || 'place'));
        const saved = sameType || (pr.parts[x.part]?.actionSource || (x.t === 'fasten' && pr.parts[x.part]?.std) ? findRow(() => true) : null);
        if (hasSub) y.sub = sb;
        if (saved) {
          saved.used = true;
          const fields = sameType ? ED : ['off'];
          fields.forEach(k => { if (saved.x[k] !== undefined) y[k] = saved.x[k]; });
          if (manual) {
            y.t = y.actionOverride = saved.x.actionOverride;
            if (saved.x.pcs?.length && saved.x.pcs.every(i => sec.idx.includes(i) && pr.pieces[i].part === x.part)) {
              y.pcs = saved.x.pcs;
              y.q = y.pcs.length;
            }
          }
          if (saved.x.del) y.del = true;
        }
        return { y, sb: hasSub ? sb : 0, r: saved ? saved.r : null, fi };
      });
''')
        logic = logic.replace('flat.filter(o => o.si === si && o.x.isNew)', 'flat.filter(o => o.si === si && (o.x.isNew || o.x.extraAction))', 1)
        logic = logic.replace(
            "svg.appendChild(lead); svg.appendChild(path);",
            "lead.setAttribute('data-step-leaders', ''); svg.appendChild(lead); svg.appendChild(path);",
        )
        logic = logic.replace(
            '  lkLoop() {',
            '''  lkLeaderPoint(step, future, s, cam, width, height) {
    if (step.del || step.blank || (future && !(s.tm ? s.ghost : s.showFuture))) return null;
    const T = window.THREE, bounds = new T.Box3(), part = new T.Box3(), offset = new T.Vector3();
    for (const i of this.lkPcs(step)) {
      const piece = this.pr.pieces[i];
      const visible = piece.obj.visible ? piece.obj : piece.wireM.visible ? piece.wireM : null;
      if (visible) bounds.union(part.copy(this.lkB(i)).translate(offset.subVectors(visible.position, piece.home)));
    }
    if (bounds.isEmpty()) return null;
    const point = bounds.getCenter(offset).project(cam);
    if (!(Math.abs(point.x) <= 1 && Math.abs(point.y) <= 1 && Math.abs(point.z) <= 1)) return null;
    return [(point.x + 1) / 2 * width, (1 - point.y) / 2 * height];
  }
  lkLoop() {''',
        )
        logic = logic.replace(
            "e.ld.style.display = vis ? 'block' : 'none'; e.dot.style.display = vis ? 'block' : 'none';",
            '''const future = k > s.cur, hovered = this.lkHov === k;
      const leader = vis && !dragMe && (Math.abs(k - s.cur) <= 1 || hovered)
        ? this.lkLeaderPoint(arr[k], future, s, E.cam, W, H) : null;
      e.ld.style.display = e.dot.style.display = leader ? 'block' : 'none';''',
        )
        logic = between(logic, "      e.ld.setAttribute('x1', p.a[0]);", '      const show =', '''      const hv = hovered || s.lkMenu === k || k === fl;
      if (leader) {
        const primary = k === s.cur, opacity = primary ? '.9' : '.42';
        e.ld.setAttribute('x1', leader[0]);
        e.ld.setAttribute('y1', leader[1]);
        e.ld.setAttribute('x2', p.c[0]);
        e.ld.setAttribute('y2', p.c[1]);
        e.ld.setAttribute('stroke', col);
        e.ld.setAttribute('stroke-opacity', opacity);
        e.ld.setAttribute('stroke-width', primary ? '1.5' : '1');
        e.ld.setAttribute('stroke-linecap', 'round');
        e.ld.setAttribute('stroke-dasharray', primary ? '' : '2 5');
        e.dot.setAttribute('r', primary ? '3.5' : '2.5');
        e.dot.setAttribute('cx', leader[0]);
        e.dot.setAttribute('cy', leader[1]);
        e.dot.setAttribute('fill', col);
        e.dot.setAttribute('fill-opacity', opacity);
      }
''')
        logic = logic.replace(
            'this.lkHi3d(hiK != null && arr[hiK] ? this.lkPcs(arr[hiK]) : []);',
            '''const hiStep = arr[hiK];
    this.lkHi3d(hiStep && !hiStep.del ? this.lkPcs(hiStep).filter(i => {
      const piece = this.pr.pieces[i];
      return piece.obj.visible || piece.wireM.visible;
    }) : []);''',
        )
        logic = logic.replace("location.search.includes('mode=tools')", '!!this.props.tools')
        logic = logic.replace("location.search.includes('embed')", 'true')
        logic = logic.replace('window.innerHeight / (true ? 1008 : 1080)', 'window.innerHeight / 1080')
        logic = between(logic, '  toPage(sc)', '    if (!this.cvRef.current)', '''  toPage(sc) { this.stopPlayback(); if (this.referenceState.plan) this.autoSave(); this.props.onNavigate?.(sc); }
  componentDidUpdate(prevProps) {
    if (prevProps.tools === this.props.tools || !this.E) return;
    this.stopPlayback();
    this.tmGo(!!this.props.tools);
  }
  mountReference() {
    this.listen('resize', this.onResize);
''')
        logic = between(logic, ' window.ShaperHQ.apply(E);', '    let sv = null;', ''' E.frontAz = 0;
    E.M.edge.visible = false;
    const project = this.props.session.project;
    if (!project) return;
    this.pr = cloneFlowProject(project);
    if (project.key === 'shaper-reference') { window.ShaperHQ.apply(E); window.ShaperTex.patch(E, this.pr); }
    this.secOvApply();
    E.makeBuild(this.pr, solid => this.buildStepEdges(solid));
    // Fast Refresh can keep an earlier version of the public renderer loaded.
    if (E.makeBuild.length < 2) {
      for (const piece of this.pr.pieces) {
        const edges = this.buildStepEdges(piece.obj);
        piece.wireM.traverse(object => object.geometry?.dispose());
        piece.wireM.clear().add(...edges.children.slice());
      }
    }
    E.hooks = []; E.anim = [];
    this.props.session.readSteps = () => this.referenceState.plan;
''')
        logic = logic.replace('this.say(\'AI가 STEP 부품 118개로 조립 순서를 만들었습니다\')',
                              "this.say('STEP 부품 ' + this.pr.pieces.length + '개로 조립 순서 초안을 만들었습니다')")
        logic = logic.replace('  autoSave() { try', '  autoSave() { this.props.session.plan = this.referenceState.plan; this.rememberStepActions(this.referenceState.plan); try')
        logic = logic.replace('  unmountReference() {', '''  unmountReference() {
    this.props.session.readSteps = undefined;
    if (this.referenceState.plan) {
      this.props.session.plan = this.referenceState.plan;
      this.rememberStepActions(this.referenceState.plan);
      try { localStorage.setItem(this.flowKey('dx7_link_plan_all'), JSON.stringify(this.referenceState.plan)); } catch {}
    }
''')
        logic = adapt_step_controls(logic)
        logic = adapt_step_rendering(logic)
        logic = adapt_step_positions(logic)
        logic = adapt_step_position_editor(logic)
        logic = adapt_step_labels(logic)
        logic = adapt_sequence_review(logic)
        logic = adapt_step_actions(logic)
        logic = adapt_integrated_tools(logic)
        logic = adapt_advisory_validation(logic)
        logic = between(logic, "      looks: [['3d',", '      prev: go(-1)', '''      looks: s.sequenceReview ? [] : toolPanel ? [['3d', '실물'], ['wire', '와이어프레임'], ['ghost', '뒤 단계 보기']].map(([k, label]) => {
        const on = k === 'ghost' ? s.showFuture : s.look === k;
        return { ko: label, bg: on ? '#2a3238' : 'transparent', c: on ? '#ffffff' : '#8f9aa1',
          go: () => this.updateReferenceState(k === 'ghost' ? { showFuture: !s.showFuture } : { look: k }, () => this.show(false, false)) };
      }) : [{
        ko: s.showFuture ? '와이어프레임 끄기' : '와이어프레임 켜기',
        bg: s.showFuture ? '#2a3238' : 'transparent', c: s.showFuture ? '#ffffff' : '#c3cbd0',
        go: () => this.updateReferenceState(state => ({ showFuture: !state.showFuture }), () => this.show(false, false))
      }],
''')
    else:
        logic = adapt_assembly_diagram(logic)
        logic = logic.replace("() => rv ? this.go(21) : this.restore(si, x.k), true", "() => rv ? this.go(21) : this.restore(si, x.k), false", 1)
        logic = logic.replace("() => rv && !a ? this.go(21) : this.ack(key), !a", "() => rv && !a ? this.go(21) : this.ack(key), false", 1)
        logic = logic.replace(", [22, '체결 · 공구']", '', 1)
        logic = logic.replace('visited: 7', 'visited: this.PAGES.length - 1', 1)
        logic = re.sub(r"(  TOOL_LIB = \[.*?\]);", r"\1.concat(FLOW_FASTENING_TOOLS.filter(tool => !['torque0', 'ph2', 'hex4', 'hex5', 'hex6', 'hex8', 'hex10'].includes(tool.k)).map(tool => ({ k: tool.k, ko: tool.ko, spec: '' })));", logic, count=1)
        logic = logic.replace("toolKey(st) { const t = String(st.toolKo || ''),", "toolKey(st) { const tool = findFlowFasteningTool(st.toolK, st.tool || st.toolKo); if (tool) return drawingToolKey(tool.k); const t = String(st.toolKo || ''),", 1)
        logic = logic.replace('  mountReference() {', '  mountReference() {\n    this.openFlow();', 1)
        logic = between(logic, '    this.bootP = this.boot();', '    this.E = new window.FlowEngine', '''    this.bootP = this.boot().catch(error => {
      console.error(error);
      this.updateReferenceState({ ferr: '3D 미리보기를 시작하지 못했습니다. 브라우저를 다시 열어 주세요.' });
    });
    const start = this.props.start;
    if ([20, 21, 22, 23, 24].includes(start)) void this.bootP.then(async () => {
      if (!this.E) return;
      await this.flowSample();
      this.updateReferenceState({ visited: 7 });
      this.go(start);
    });
  }
  async boot() {
    if (!this.cvRef.current) return;
''')
        logic = logic.replace(' window.ShaperHQ.apply(this.E); window.ShaperTex.patch(this.E, window.FLOW_DATA.shaper);', '')
        logic = between(logic, '    (pr => { const sec = pr.sections[0];', '    const pr = this.pr, keys =', '''    this.forceUpdate();
  }
  loadFlowProject(project) {
    if (!this.E) return;
    clearTimeout(this._svT);
    project = prepareFlowProject(project);
    this.props.session.project = project;
    this.props.session.plan = undefined;
    this.pr = cloneFlowProject(project);
    this.META = { ...this.META, prod: project.ko, dno: project.code };
    this._pi = this.pcSec = this.snaps = this.pvKey = this.pvDims = this.pvG = this.pvS = null;
    this.thumbsDone = false;
    for (const url of Object.values(this.referenceState.thumbs || {})) URL.revokeObjectURL(url);
    this.updateReferenceState({ plan: null, plan0: null, thumbs: {}, pOv: {}, hOv: {}, acks: {}, tools: null, elog: [], meta: this.META, visited: 0 });
    this.E.S.environment = null;
    delete this.E.solid; delete this.E.wire; delete this.E.edges;
    if (this.demo) { window.ShaperHQ.apply(this.E); window.ShaperTex.patch(this.E, this.pr); }
    this.secOvApply();
    this.E.makeBuild(this.pr);
    try {
      const draft = JSON.parse(localStorage.getItem(this.flowKey('dx7_dwdraft')) || 'null');
      if (Array.isArray(draft?.plan) && draft.plan.length === this.pr.sections.length &&
          draft.plan.every(rows => Array.isArray(rows) && rows.every(row => row && (!row.part || this.pr.parts[row.part])))) {
        const { plan, plan0, pOv, hOv, tools, meta, elog, acks } = draft;
        this.updateReferenceState({ plan, plan0: plan0 || plan, pOv: pOv || {}, hOv: hOv || {}, tools: tools || {},
          meta: { ...this.META, ...meta }, elog: elog || [], acks: acks || {}, savedAt: draft.savedAt });
      }
    } catch {}
''')
        logic = between(logic, '  async upSample(', '  hasStep()', '''  onFile(event) {
    const files = Array.from(event.target.files || []);
    event.target.value = '';
    void this.pickFlowFiles(files);
  }
  upRemove(index) { this.removeFlowFile(index); }
''')
        logic = logic.replace("  upStart() { if (!this.hasStep() || this.referenceState.loading || !this.E) return; this.go(1); }",
                              "  upStart() { if (this.E) void this.startFlowStep(); }")
        logic = logic.replace("if (sc === 1) { this.iv = this.repeat", "if (sc === 1 && this.demo) { this.iv = this.repeat")
        logic = logic.replace("resetWires() { const E = this.E, pr = this.pr; if (!E) return;",
                              "resetWires() { const E = this.E, pr = this.pr; if (!E || !pr) return;")
        logic = between(logic, '    if ((sc === 21 || sc === 22)', '    if (this.pr && this.E)', '''    if ((sc === 21 || sc === 22) && this.pr) {
      if (!this.referenceState.plan) this.initPlan();
      this.updateReferenceState(s => ({ visited: Math.max(s.visited || 0, this.pageIdx(21)), on04: 21 }));
      this.E.suspended = true;
      this.props.onOpenSteps?.(sc === 22);
      return;
    }
    if (this.referenceState.on04) {
      this.syncFlowSteps();
      this.updateReferenceState({ on04: false });
      this.E.suspended = false;
      this.props.onOpenSteps?.(null);
    }
''')
        logic = logic.replace("    if (window.parent !== window) window.parent.postMessage({ dw: 'secs' }, '*');", '')
        logic = logic.replace("if (k === -1) { clearInterval(this.iv); this.updateReferenceState({ sc: -1 }); return; }", "if (k === -1) { this.cancelStepRead(); return; }")
        logic = logic.replace("this.cancelStepRead(); return; } this.go(k);", """this.cancelStepRead(); return; }
      if (k === 2) {
        if (!s.on04 && s.sc === 24 && s.plan && !this.checks(24).some(item => item.block)) void this.publishFlowTraining();
        else this.go(24);
        return;
      }
      this.go(k);""")
        logic = logic.replace('makeHud: () => { if (ready) this.go(2); }', 'makeHud: () => { if (ready) void this.publishFlowTraining(); }')
        logic = logic.replace("src: hasPdf ? 'PDF' : 'AI 제안'", "src: this.demo ? '시연 데이터' : 'STEP 기반 초안'")
        logic = logic.replace('if (!hasPdf) steps = this.orderByModel(si, steps);', 'if (!this.demo) steps = this.orderByModel(si, steps);')
        logic = logic.replace('  unmountReference() {', '''  syncFlowSteps() {
    const plan = this.props.session.readSteps?.() ?? this.props.session.plan;
    if (!plan) return;
    const tools = {};
    const next = this.pr.sections.map((section, si) => {
      let target = null;
      return (plan[si] || []).filter(row => !row.del && !row.blank && this.pr.parts[row.part]).map((row, index) => {
        const id = si + '-linked-' + index;
        const step = { ...row, id, o: index, txt: row.g || row.txt, toolKo: row.tool || row.toolKo, tgt: target, src: '조립 순서' };
        if (step.t !== 'fasten') target = id;
        else {
          const tool = this.toolKey(step);
          if (tool) tools[tool] = 'auto';
          if (step.nm) tools.torque = 'auto';
        }
        if (/압입/.test(step.txt || '')) tools.press = 'auto';
        return step;
      });
    });
    this.updateReferenceState({ plan: next, tools });
  }
  unmountReference() { this.disposeFlowFiles();
    for (const url of Object.values(this.referenceState.thumbs || {})) URL.revokeObjectURL(url);
''')
        logic = between(logic, '  async aiAsk()', '  aiApply(', '''  aiAsk() {
    const s = this.referenceState, q = (s.aiQ || '').trim(), si = s.sel?.si ?? s.ps ?? 0, k = s.sel?.k ?? s.pk ?? 0;
    const suggestion = localPlanSuggestion(q, k, (s.plan?.[si] || []).length);
    if (!suggestion) { this.aiFail('앞으로 또는 뒤로 이동을 요청하거나 직접 편집해 주세요.', ''); return; }
    const result = this.aiApply(si, [{ op: 'move', from: k, to: suggestion.target }]);
    if (result.err) { this.aiFail(result.err, ''); return; }
    this._aiOrig = s.plan;
    this.updateReferenceState({ plan: result.plan, aiPend: { si, sum: suggestion.summary, n: 1, ch: result.ch, q }, aiQ: '' });
  }
''')
        logic = logic.replace("import(new URL('drawing-model6.js', document.baseURI).href)",
                              "import(/* webpackIgnore: true */ /* turbopackIgnore: true */ '/vendor/drawing-flow/drawing-model6.js')")
        logic = logic.replace("this.js('part-library7.js?v=1')", "this.js('/vendor/drawing-flow/part-library7.js')")
        logic = logic.replace("import('https://esm.sh/html-to-image@1.11.11')", "import('html-to-image')")
        logic = logic.replace("import('https://esm.sh/jspdf@2.5.1')", "import('jspdf')")
        logic = logic.replace('this.frames(', 'this.awaitFrames(').replace('  frames(', '  awaitFrames(')
        logic = logic.replace("name = 'DX-ASM-SHP-001_rev'", "name = (this.referenceState.meta?.dno || this.META.dno).replace(/[^a-z0-9_.-]/gi, '-') + '_rev'")
        logic = logic.replace("localStorage.setItem(this.flowKey('dx7_dwdraft'), this.snapH());", """const s = this.referenceState;
      if (s.plan && !s.aiPend) localStorage.setItem(this.flowKey('dx7_dwdraft'), JSON.stringify({
        ...JSON.parse(this.snapH()), plan0: s.plan0, meta: s.meta, elog: s.elog, acks: s.acks,
        savedAt: new Date().toTimeString().slice(0, 5)
      }));""")
        logic = logic.replace('a.click(); a.remove();', 'a.click(); a.remove(); this.delay(() => URL.revokeObjectURL(a.href), 30000);')
        logic = logic.replace("'교육 선택 등록', '교육 선택에 모델이 추가되었습니다'", "'교육장 실행', '아래 버튼에서 현재 구성을 실습할 수 있습니다'")
        logic = logic.replace("upSampleA: () => this.upSample(false), upSampleB: () => this.upSample(true)",
                              "upSampleA: () => this.flowSample(), pdfOn: s.pdfOn, pdfInfo: s.pdfInfo, launchTraining: () => this.launchFlowTraining(), launchTrainingKey: e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this.launchFlowTraining(); } }")
        logic = logic.replace("let css; try { css = await this.fontCss(); } catch (e) { css = undefined; }",
                              "if (!nodes.length) throw new Error('내보낼 도면 시트가 없습니다.'); let css; try { css = await this.fontCss(); } catch (e) { css = undefined; }")
        logic = logic.replace("'모양과 위치는 STEP, 순서와 토크는 PDF를 따릅니다'", "s.pdfInfo || '첨부한 PDF를 읽는 중입니다'")
        logic = logic.replace("'소형 금속 성형기 · 구간 '", "(pr?.ko || this.META.prod) + ' · 구간 '")
        logic = logic.replace('(nP * 1480).toLocaleString()', '(pr?.triangles ?? (this.demo ? nP * 1480 : 0)).toLocaleString()')
        logic = logic.replace("'PDF 부품표와 비교 · 다른 곳 0건'", "s.pdfInfo || 'PDF 원문 확인 필요'")
        logic = logic.replace("elapsed: this.tAt(p).toFixed(1)", "elapsed: (this.demo ? this.tAt(p) : (s.readMs || 0) / 1000).toFixed(1)")
        logic = logic.replace('ps.meta !== this.referenceState.meta)', 'ps.meta !== this.referenceState.meta || ps.acks !== this.referenceState.acks)')
        for value in ('s.ko', 'p.ko'):
            logic = logic.replace('${' + value + '}', '${escapeFlowHtml(' + value + ')}')
        for value in ('it.txt', 'it.sub', 'it.cnt', 'q.name'):
            logic = logic.replace(' + ' + value + ' + ', ' + escapeFlowHtml(' + value + ') + ')
    logic = logic.replace('window.parent !== window', 'false')
    logic = logic.replace('window.addEventListener(', 'this.listen(').replace('window.removeEventListener(', 'this.unlisten(')
    return logic

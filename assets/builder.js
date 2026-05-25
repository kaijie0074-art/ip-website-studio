/* ============================================
   Try It · Builder — Claude API in-browser site generator
   No deps. User brings own Anthropic key.
   ============================================ */
(function(){
  'use strict';

  const LS_KEY = 'ipwc_api_key';
  const API_URL = 'https://api.anthropic.com/v1/messages';
  const MODEL = 'claude-sonnet-4-6';
  const ANTHROPIC_VERSION = '2023-06-01';

  const DIMENSIONS = [
    { id:'form',     label:'form',     desc:'排版 / 长文' },
    { id:'motion',   label:'motion',   desc:'动效 / 影片' },
    { id:'threeD',   label:'3D',       desc:'three.js / 粒子' },
    { id:'media',    label:'media',    desc:'BGM / 真照片' },
    { id:'duration', label:'duration', desc:'海报 / 滚动' },
    { id:'style',    label:'style',    desc:'风格主导' },
  ];

  // ---------- state ----------
  let systemPrompt = '';
  let abortController = null;
  let images = []; // [{name, dataUrl, mediaType, base64}]
  let chosenDim = null;
  let lastHtml = '';
  let lastCritic = null;
  let iteration = 0;
  let prevCriticFeedback = null;
  const MAX_ITERATIONS = 2;

  // ---------- inject modal + section ----------
  function injectStyles(){
    if (document.querySelector('link[data-ipwc]')) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'assets/builder.css';
    link.setAttribute('data-ipwc','1');
    document.head.appendChild(link);
  }

  function injectSection(){
    // Mount as the second screen — right above About.
    const anchor = document.querySelector('section.about');
    if (!anchor) return;

    const sec = document.createElement('section');
    sec.className = 'tryit section-pad';
    sec.id = 'tryit';
    sec.innerHTML = `
      <div class="section-eyebrow"><span class="line"></span><span>SECTION · 01 / TRY IT</span></div>
      <h2 class="section-title">TRY IT · <em>用它</em><br/>造一个 <span class="accent">网站</span></h2>
      <div class="tryit-inner">
        <p class="tryit-lede">
          拿你自己的 <em>Anthropic API key</em>，
          把你想说的事丢进来，<br/>
          几分钟后下载一个能直接打开的单文件 HTML。
          <span class="accent">你的数据不会离开这台浏览器。</span>
        </p>
        <button class="tryit-cta" id="ipwc-open-btn" type="button">
          <span>打开建站工作台</span>
          <span class="arrow">→</span>
        </button>
        <div class="tryit-fineprint">
          <span>BYOK · bring your own key</span>
          <span>SSE streaming</span>
          <span>in-browser only</span>
          <span>单文件 HTML 下载</span>
        </div>
      </div>
    `;

    // Insert divider then sec then divider before #about
    const dividerBefore = document.createElement('div');
    dividerBefore.className = 'divider';
    const dividerAfter = document.createElement('div');
    dividerAfter.className = 'divider';

    anchor.parentNode.insertBefore(dividerBefore, anchor);
    anchor.parentNode.insertBefore(sec, anchor);
    anchor.parentNode.insertBefore(dividerAfter, anchor);

    document.getElementById('ipwc-open-btn').addEventListener('click', openModal);
  }

  function injectModal(){
    const modal = document.createElement('div');
    modal.className = 'ipwc-modal';
    modal.id = 'ipwc-modal';
    modal.setAttribute('role','dialog');
    modal.setAttribute('aria-modal','true');
    modal.setAttribute('aria-label','Try It builder');
    modal.innerHTML = `
      <div class="ipwc-shell">
        <div class="ipwc-head">
          <div class="ipwc-head-titles">
            <div class="ipwc-eyebrow"><span class="ipwc-dot"></span><span>BUILDER · v1 · ip-website-studio</span></div>
            <h2 class="ipwc-title">用它造一个 <em>网站</em></h2>
            <div class="ipwc-privacy">你的 API key + 输入只在这台浏览器，不经过我们的服务器</div>
          </div>
          <button class="ipwc-close" id="ipwc-close" type="button" aria-label="close">×</button>
        </div>

        <div class="ipwc-grid">
          <!-- LEFT · input -->
          <div class="ipwc-col">
            <div class="ipwc-col-head"><span class="num">01</span><span>INPUT</span></div>

            <div class="ipwc-field">
              <label class="ipwc-label">Anthropic API Key<span class="req">*</span></label>
              <div class="ipwc-key-row">
                <input class="ipwc-input" id="ipwc-key" type="password" placeholder="sk-ant-..." autocomplete="off" spellcheck="false" />
                <button class="ipwc-btn-test" id="ipwc-test" type="button">测试连接</button>
              </div>
              <label class="ipwc-checkbox">
                <input type="checkbox" id="ipwc-save" checked />
                <span>保存到这台浏览器（localStorage）</span>
              </label>
            </div>

            <div class="ipwc-field">
              <label class="ipwc-label">描述你想要的网站<span class="req">*</span></label>
              <textarea class="ipwc-textarea" id="ipwc-prompt" placeholder="例：给我女朋友的生日做一个 single-poster 表白页，背景是深色暖光，主标题用 Fraunces 衬线斜体，要有 grain 和暖金色装饰线，三段她让我难忘的具体片段（第一段写她在外滩 18 号转身那次）。"></textarea>
            </div>

            <div class="ipwc-field">
              <label class="ipwc-label">维度（单选）</label>
              <div class="ipwc-chips" id="ipwc-chips"></div>
            </div>

            <div class="ipwc-field">
              <label class="ipwc-label">参考图片（可选，≤ 3 张，内嵌 base64）</label>
              <label class="ipwc-uploader" id="ipwc-uploader">
                <input type="file" accept="image/*" multiple id="ipwc-files" />
                <span>点击或拖入 · 用作真实素材而非占位</span>
              </label>
              <div class="ipwc-thumbs" id="ipwc-thumbs"></div>
            </div>

            <button class="ipwc-go" id="ipwc-go" type="button" disabled>
              <span id="ipwc-go-label">▶  生成网站</span>
            </button>

            <div class="ipwc-error" id="ipwc-error">
              <div class="ipwc-error-head">ERROR</div>
              <div id="ipwc-error-msg"></div>
            </div>
          </div>

          <!-- RIGHT · output -->
          <div class="ipwc-col">
            <div class="ipwc-col-head"><span class="num">02</span><span>OUTPUT</span></div>

            <div class="ipwc-output-empty" id="ipwc-empty">
              <div class="ipwc-eyebrow"><span>等待启动</span></div>
              <div>填好左侧，点 ▶ 生成。<br/>这里会出现流式进度 + iframe 预览。</div>
            </div>

            <div class="ipwc-progress" id="ipwc-progress" style="--ipwc-pct:0%">
              <div class="ipwc-progress-line" data-step="0"><span class="marker"></span><span>读取训练资产...</span></div>
              <div class="ipwc-progress-line" data-step="1"><span class="marker"></span><span>构思结构与维度匹配...</span></div>
              <div class="ipwc-progress-line" data-step="2"><span class="marker"></span><span>写入 CSS 与字体系统...</span></div>
              <div class="ipwc-progress-line" data-step="3"><span class="marker"></span><span>填入文案与动效骨架...</span></div>
              <div class="ipwc-progress-line" data-step="4"><span class="marker"></span><span>收尾 · 自检 · 准备 critic...</span></div>
              <div class="ipwc-progress-byte" id="ipwc-bytes">0 chars · iteration 1</div>
            </div>

            <div class="ipwc-critic" id="ipwc-critic">
              <div class="ipwc-critic-head">
                <div>
                  <div class="ipwc-critic-score"><span id="ipwc-score">0</span><span class="of"> / 5</span></div>
                  <div class="ipwc-critic-label" id="ipwc-ship-label">CRITIC · evaluating</div>
                </div>
                <div class="ipwc-critic-label" id="ipwc-iter-label">iteration 1 / 2</div>
              </div>
              <ul class="ipwc-critic-gaps" id="ipwc-gaps"></ul>
            </div>

            <div class="ipwc-preview-wrap" id="ipwc-preview-wrap">
              <iframe class="ipwc-iframe" id="ipwc-iframe" sandbox="allow-scripts allow-same-origin" title="generated preview"></iframe>
              <div class="ipwc-actions">
                <button class="ipwc-btn primary" id="ipwc-download" type="button">⬇  下载 HTML</button>
                <button class="ipwc-btn" id="ipwc-open-tab" type="button">↗  新标签页打开</button>
                <button class="ipwc-btn" id="ipwc-again" type="button">↻  再来一个</button>
              </div>
            </div>
          </div>
        </div>

        <div class="ipwc-foot">
          system-prompt: <a href="assets/system-prompt.txt" target="_blank">查看完整训练摘要</a>
          · 模型 ${MODEL}
          · stream:true
          · max_tokens 16000
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    // wire up chips
    const chipBox = modal.querySelector('#ipwc-chips');
    DIMENSIONS.forEach(d => {
      const c = document.createElement('button');
      c.type = 'button';
      c.className = 'ipwc-chip';
      c.dataset.dim = d.id;
      c.innerHTML = `<span>${d.label}</span><span class="ipwc-chip-desc">${d.desc}</span>`;
      c.addEventListener('click', () => selectDim(d.id));
      chipBox.appendChild(c);
    });

    // wire up events
    modal.querySelector('#ipwc-close').addEventListener('click', closeModal);
    modal.addEventListener('click', e => {
      // click on backdrop closes
      if (e.target === modal) closeModal();
    });

    const keyInput = modal.querySelector('#ipwc-key');
    const saveBox = modal.querySelector('#ipwc-save');
    const promptBox = modal.querySelector('#ipwc-prompt');

    // restore key
    const stored = (() => {
      try { return localStorage.getItem(LS_KEY) || ''; } catch(_){ return ''; }
    })();
    if (stored){ keyInput.value = stored; }

    keyInput.addEventListener('input', () => {
      validateForm();
      if (saveBox.checked){
        try { localStorage.setItem(LS_KEY, keyInput.value); } catch(_){}
      }
    });
    saveBox.addEventListener('change', () => {
      if (saveBox.checked){
        try { localStorage.setItem(LS_KEY, keyInput.value); } catch(_){}
      } else {
        try { localStorage.removeItem(LS_KEY); } catch(_){}
      }
    });
    promptBox.addEventListener('input', validateForm);

    modal.querySelector('#ipwc-test').addEventListener('click', testKey);
    modal.querySelector('#ipwc-files').addEventListener('change', handleFiles);
    modal.querySelector('#ipwc-go').addEventListener('click', startGenerate);
    modal.querySelector('#ipwc-download').addEventListener('click', downloadHtml);
    modal.querySelector('#ipwc-open-tab').addEventListener('click', openInTab);
    modal.querySelector('#ipwc-again').addEventListener('click', resetForNext);

    // ESC to close
    document.addEventListener('keydown', e => {
      const isOpen = modal.classList.contains('is-open');
      if (isOpen && e.key === 'Escape') closeModal();
    });
  }

  function selectDim(id){
    chosenDim = id;
    document.querySelectorAll('.ipwc-chip').forEach(c => {
      c.classList.toggle('is-on', c.dataset.dim === id);
    });
    validateForm();
  }

  function validateForm(){
    const key = document.getElementById('ipwc-key').value.trim();
    const prompt = document.getElementById('ipwc-prompt').value.trim();
    const ok = key.length > 5 && prompt.length > 2;
    document.getElementById('ipwc-go').disabled = !ok;
  }

  // ---------- modal open / close ----------
  async function openModal(){
    if (!systemPrompt){
      try{
        const r = await fetch('assets/system-prompt.txt', { cache:'no-cache' });
        systemPrompt = await r.text();
      }catch(err){
        systemPrompt = 'You are build-site agent. Produce a single-file HTML site. Return ONLY raw HTML starting with <!DOCTYPE html>.';
      }
    }
    const m = document.getElementById('ipwc-modal');
    m.classList.add('is-open');
    document.body.classList.add('ipwc-locked');
    validateForm();
  }

  function closeModal(){
    const m = document.getElementById('ipwc-modal');
    m.classList.remove('is-open');
    document.body.classList.remove('ipwc-locked');
    // abort any in-flight request
    if (abortController){
      try { abortController.abort(); } catch(_){}
      abortController = null;
    }
  }

  // ---------- image upload ----------
  function handleFiles(e){
    const files = Array.from(e.target.files || []);
    const room = Math.max(0, 3 - images.length);
    const slice = files.slice(0, room);
    slice.forEach(f => {
      const reader = new FileReader();
      reader.onload = ev => {
        const dataUrl = ev.target.result;
        // dataUrl: "data:image/png;base64,..."
        const m = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
        if (!m) return;
        images.push({
          name: f.name,
          dataUrl,
          mediaType: m[1],
          base64: m[2],
        });
        renderThumbs();
      };
      reader.readAsDataURL(f);
    });
    e.target.value = '';
  }
  function renderThumbs(){
    const wrap = document.getElementById('ipwc-thumbs');
    wrap.innerHTML = '';
    images.forEach((img, i) => {
      const t = document.createElement('div');
      t.className = 'ipwc-thumb';
      t.style.backgroundImage = `url('${img.dataUrl}')`;
      t.title = img.name;
      const x = document.createElement('button');
      x.type = 'button';
      x.className = 'ipwc-thumb-x';
      x.textContent = '×';
      x.addEventListener('click', () => {
        images.splice(i, 1);
        renderThumbs();
      });
      t.appendChild(x);
      wrap.appendChild(t);
    });
  }

  // ---------- key test (1-token ping) ----------
  async function testKey(){
    const btn = document.getElementById('ipwc-test');
    const key = document.getElementById('ipwc-key').value.trim();
    if (!key){
      flashTest(btn, 'err', '需要 key');
      return;
    }
    btn.disabled = true;
    btn.textContent = '测试中...';
    btn.classList.remove('ok','err');
    try{
      const res = await fetch(API_URL, {
        method:'POST',
        headers:{
          'x-api-key': key,
          'anthropic-version': ANTHROPIC_VERSION,
          'anthropic-dangerous-direct-browser-access': 'true',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: 4,
          messages: [{ role:'user', content:'ping' }],
        }),
      });
      if (res.ok){
        flashTest(btn, 'ok', '✓ key 可用');
      } else {
        const j = await res.json().catch(() => ({}));
        const msg = j?.error?.message || res.statusText || ('HTTP '+res.status);
        flashTest(btn, 'err', '✗ ' + (res.status === 401 ? '401 无效 key' : ('错误: ' + msg.slice(0,40))));
      }
    } catch(err){
      flashTest(btn, 'err', '✗ 网络错误');
    }
    btn.disabled = false;
  }
  function flashTest(btn, kind, msg){
    btn.classList.remove('ok','err');
    btn.classList.add(kind);
    btn.textContent = msg;
    setTimeout(() => {
      btn.classList.remove('ok','err');
      btn.textContent = '测试连接';
    }, 4500);
  }

  // ---------- generate ----------
  async function startGenerate(){
    iteration = 1;
    prevCriticFeedback = null;
    lastCritic = null;
    showError(null);
    showProgress(true);
    showPreview(false);
    showCritic(false);
    await runOneIteration();
  }

  async function runOneIteration(){
    const key = document.getElementById('ipwc-key').value.trim();
    const userPrompt = document.getElementById('ipwc-prompt').value.trim();
    const goBtn = document.getElementById('ipwc-go');
    const goLabel = document.getElementById('ipwc-go-label');

    goBtn.disabled = true;
    goBtn.classList.add('is-running');
    goLabel.textContent = iteration === 1 ? '◌ 生成中...（第 1 轮）' : '◌ critic 反馈中 · 第 2 轮';

    setProgressStep(0);

    // build user message content blocks
    const contentBlocks = [];
    images.forEach(img => {
      contentBlocks.push({
        type: 'image',
        source: { type:'base64', media_type: img.mediaType, data: img.base64 },
      });
    });

    let userText = '';
    userText += '【用户描述】\n' + userPrompt + '\n\n';
    userText += '【选定维度】' + (chosenDim || '(未指定，请自行选择最合适的)') + '\n\n';
    if (images.length){
      userText += '【素材】用户上传了 ' + images.length + ' 张图片（见消息中的 image blocks）。MUST 把这些图片作为 base64 data URL 嵌入生成的 HTML 里，禁止 Unsplash 占位。\n\n';
    }
    if (prevCriticFeedback){
      userText += '【上一轮 critic 反馈】这是你第二轮。critic 给上一版打了 ' + prevCriticFeedback.score + '/5，找到这些差距：\n';
      (prevCriticFeedback.gaps || []).forEach(g => { userText += ' - ' + g + '\n'; });
      userText += '\n请针对这些 gap 重新写一版，不要重复上一版的问题。\n\n';
    }
    userText += '现在按 system prompt 的硬约束输出完整 <!DOCTYPE html>...</html>。';

    contentBlocks.push({ type:'text', text: userText });

    abortController = new AbortController();
    let fullHtml = '';
    setBytes(0);

    try{
      const res = await fetch(API_URL, {
        method:'POST',
        signal: abortController.signal,
        headers:{
          'x-api-key': key,
          'anthropic-version': ANTHROPIC_VERSION,
          'anthropic-dangerous-direct-browser-access': 'true',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: 16000,
          stream: true,
          system: systemPrompt,
          messages: [{ role:'user', content: contentBlocks }],
        }),
      });

      if (!res.ok){
        const j = await res.json().catch(() => ({}));
        const msg = j?.error?.message || res.statusText || ('HTTP '+res.status);
        throw new Error('Anthropic API 返回 ' + res.status + ': ' + msg);
      }

      // SSE stream
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true){
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream:true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines){
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6).trim();
          if (!data || data === '[DONE]') continue;
          try{
            const evt = JSON.parse(data);
            if (evt.type === 'content_block_delta' && evt.delta?.type === 'text_delta'){
              fullHtml += evt.delta.text;
              setBytes(fullHtml.length);
              advanceProgressByBytes(fullHtml.length);
            }
          }catch(_){}
        }
      }
    } catch(err){
      if (err.name === 'AbortError') return; // closed mid-flight
      showError(err.message || String(err));
      resetGoButton();
      showProgress(false);
      return;
    }

    setProgressStep(4, true);
    abortController = null;

    // extract HTML
    const htmlMatch = fullHtml.match(/<!DOCTYPE[\s\S]*<\/html>/i);
    const cleanHtml = htmlMatch ? htmlMatch[0] : fullHtml.trim();
    if (!cleanHtml || !/<html[\s>]/i.test(cleanHtml)){
      showError('返回内容不是有效 HTML（开头未见 <!DOCTYPE html>）。原始前 200 字符：\n' + fullHtml.slice(0,200));
      resetGoButton();
      showProgress(false);
      return;
    }

    lastHtml = cleanHtml;
    showPreview(true);
    renderPreview(cleanHtml);

    // critic pass
    await runCritic(key, cleanHtml);

    // decide iterate
    if (lastCritic && lastCritic.ship === false && (lastCritic.score ?? 5) < 3.5 && iteration < MAX_ITERATIONS){
      prevCriticFeedback = lastCritic;
      iteration += 1;
      setBytes(0);
      [0,1,2,3,4].forEach(i => setProgressStep(i, false, true));
      document.getElementById('ipwc-iter-label').textContent = 'iteration ' + iteration + ' / ' + MAX_ITERATIONS;
      document.getElementById('ipwc-bytes').textContent = '0 chars · iteration ' + iteration;
      await runOneIteration();
      return;
    }

    resetGoButton();
  }

  function resetGoButton(){
    const goBtn = document.getElementById('ipwc-go');
    const goLabel = document.getElementById('ipwc-go-label');
    goBtn.disabled = false;
    goBtn.classList.remove('is-running');
    goLabel.textContent = '▶  再生成一次';
  }

  // ---------- critic ----------
  async function runCritic(key, html){
    const CRITIC_SYSTEM = `You are the critic — independent of the generator. Score the HTML against the 28-item rubric (R-001 → R-028) and the anti-inflate principles (P-036 → P-039). Be conservative: assume the generator inflated 0.4 ~ 0.75. Return ONLY JSON, no commentary, no markdown fences:
{"score": <number 0-5 with 0.05 step>, "gaps": ["short gap line", ...up to 8], "ship": <boolean — true only if score >= 4.0 AND no R-001/R-002/R-009/R-028 violation>}`;

    const sampleHtml = html.length > 10000 ? html.slice(0,10000) + '\n<!-- ...truncated... -->' : html;

    try{
      const res = await fetch(API_URL, {
        method:'POST',
        headers:{
          'x-api-key': key,
          'anthropic-version': ANTHROPIC_VERSION,
          'anthropic-dangerous-direct-browser-access': 'true',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: 1200,
          system: CRITIC_SYSTEM,
          messages: [{
            role:'user',
            content: '评分以下 HTML：\n\n' + sampleHtml + '\n\nReturn ONLY the JSON.',
          }],
        }),
      });
      if (!res.ok) return;
      const j = await res.json();
      const text = j?.content?.[0]?.text || '';
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return;
      const parsed = JSON.parse(jsonMatch[0]);
      lastCritic = {
        score: typeof parsed.score === 'number' ? parsed.score : 0,
        gaps: Array.isArray(parsed.gaps) ? parsed.gaps : [],
        ship: !!parsed.ship,
      };
      renderCritic(lastCritic);
    } catch(err){
      // critic failure non-fatal
      console.warn('critic failed', err);
    }
  }

  function renderCritic(c){
    showCritic(true);
    document.getElementById('ipwc-score').textContent = c.score.toFixed(2);
    const lab = document.getElementById('ipwc-ship-label');
    lab.textContent = c.ship ? 'CRITIC · SHIP IT' : 'CRITIC · 需要再来一轮';
    lab.classList.remove('ship','fail');
    lab.classList.add(c.ship ? 'ship' : 'fail');
    const gaps = document.getElementById('ipwc-gaps');
    gaps.innerHTML = '';
    (c.gaps.length ? c.gaps : ['(critic 没找到具体差距)']).forEach(g => {
      const li = document.createElement('li');
      li.textContent = g;
      gaps.appendChild(li);
    });
    document.getElementById('ipwc-iter-label').textContent = 'iteration ' + iteration + ' / ' + MAX_ITERATIONS;
  }

  // ---------- preview / progress helpers ----------
  function renderPreview(html){
    const iframe = document.getElementById('ipwc-iframe');
    iframe.srcdoc = html;
  }

  function showProgress(on){
    const empty = document.getElementById('ipwc-empty');
    const prog = document.getElementById('ipwc-progress');
    if (on){
      empty.style.display = 'none';
      prog.classList.add('is-on');
    } else {
      prog.classList.remove('is-on');
    }
  }
  function showPreview(on){
    const wrap = document.getElementById('ipwc-preview-wrap');
    wrap.classList.toggle('is-on', on);
    if (on){
      document.getElementById('ipwc-empty').style.display = 'none';
    }
  }
  function showCritic(on){
    document.getElementById('ipwc-critic').classList.toggle('is-on', on);
  }
  function showError(msg){
    const box = document.getElementById('ipwc-error');
    if (!msg){ box.classList.remove('is-on'); return; }
    document.getElementById('ipwc-error-msg').textContent = msg;
    box.classList.add('is-on');
  }
  function setProgressStep(step, finalDone, reset){
    const lines = document.querySelectorAll('.ipwc-progress-line');
    lines.forEach((l, i) => {
      l.classList.remove('is-active','is-done');
      if (reset) return;
      if (i < step) l.classList.add('is-done');
      else if (i === step) l.classList.add(finalDone ? 'is-done' : 'is-active');
    });
    const pct = reset ? 0 : Math.min(100, ((step + (finalDone ? 1 : 0.5)) / 5) * 100);
    document.getElementById('ipwc-progress').style.setProperty('--ipwc-pct', pct + '%');
  }
  function advanceProgressByBytes(n){
    // heuristic: < 1500 step 1; < 4000 step 2; < 8000 step 3; >= 8000 step 4
    let step = 1;
    if (n > 4000) step = 2;
    if (n > 8000) step = 3;
    if (n > 12000) step = 4;
    setProgressStep(step);
  }
  function setBytes(n){
    document.getElementById('ipwc-bytes').textContent = n + ' chars · iteration ' + iteration;
  }

  // ---------- download / open / again ----------
  function downloadHtml(){
    if (!lastHtml) return;
    const blob = new Blob([lastHtml], { type:'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ipwc-site-' + Date.now() + '.html';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }
  function openInTab(){
    if (!lastHtml) return;
    const blob = new Blob([lastHtml], { type:'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  }
  function resetForNext(){
    iteration = 1;
    prevCriticFeedback = null;
    lastCritic = null;
    lastHtml = '';
    showCritic(false);
    showPreview(false);
    showProgress(false);
    document.getElementById('ipwc-empty').style.display = 'flex';
    document.getElementById('ipwc-prompt').focus();
  }

  // ---------- init ----------
  function init(){
    injectStyles();
    injectSection();
    injectModal();
  }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

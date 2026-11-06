"""End-to-end QA for the portfolio build. Prints PASS/FAIL per case."""
import asyncio, json, sys
from playwright.async_api import async_playwright

import os
URL = "file://" + os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "dist", "index.html"))
ARGS = ["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader","--ignore-gpu-blocklist","--autoplay-policy=no-user-gesture-required"]
results = []
def check(name, ok, info=""):
    results.append((name, bool(ok), info))
    print(("PASS " if ok else "FAIL ") + name + (f"  [{info}]" if info else ""), flush=True)

AUDIO_SPY = """
(() => {
  window.__osc = 0;
  const AC = window.AudioContext;
  const orig = AC.prototype.createOscillator;
  AC.prototype.createOscillator = function(){ window.__osc++; return orig.call(this); };
  window.__ctxs = [];
  const H = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function(t, ...a){ const c = H.call(this, t, ...a); if (/webgl/.test(t) && c && !window.__ctxs.includes(c)) window.__ctxs.push(c); return c; };
})();
"""

async def enter(pg, name="Priya Sharma", sound=True):
    await pg.wait_for_selector("#visitor-name", timeout=60000)
    if name is not None:
        await pg.fill("#visitor-name", name)
    if sound: await pg.click("button[type=submit]")
    else: await pg.click("text=Enter silently")
    await pg.wait_for_selector(".splash", state="detached", timeout=30000)
    await pg.wait_for_timeout(1500)

async def top_of(pg, sel):
    return await pg.evaluate(f"""(()=>{{const e=document.querySelector('{sel}');const b=e.parentElement.classList.contains('pin-spacer')?e.parentElement:e;return b.getBoundingClientRect().top+scrollY}})()""")

async def desktop(b):
    pg = await b.new_page(viewport={"width":1440,"height":900})
    errs, warns = [], []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.on("console", lambda m: (errs if m.type=="error" else warns).append(m.text) if m.type in ("error","warning") and "GPU stall" not in m.text and "GL Driver" not in m.text else None)
    await pg.add_init_script(AUDIO_SPY)
    await pg.goto(URL)

    # gate
    await pg.wait_for_selector("#visitor-name", timeout=60000)
    check("D gate: name input focused", await pg.evaluate("document.activeElement && document.activeElement.id==='visitor-name'"))
    await pg.fill("#visitor-name", "<b>Priya</b> Sharma!!")
    btn = await pg.inner_text("button[type=submit]")
    check("D gate: button shows first name", "PRIYA" in btn.upper() or "<B>" in btn.upper(), btn)
    await pg.fill("#visitor-name", "Priya Sharma")
    sh0 = await pg.evaluate("document.documentElement.scrollHeight")
    await pg.mouse.wheel(0, 800); await pg.wait_for_timeout(400)
    check("D gate: page cannot scroll behind loader", await pg.evaluate("scrollY") == 0)
    await pg.click("button[type=submit]")
    await pg.wait_for_timeout(1800)
    sp = await pg.evaluate("document.querySelector('.splash__name')?.getAttribute('aria-label')")
    check("D splash: shows visitor first name", sp == "Priya", str(sp))
    check("D intro sound: oscillators created", await pg.evaluate("window.__osc") > 10, str(await pg.evaluate("window.__osc")))
    await pg.wait_for_selector(".splash", state="detached", timeout=30000)
    await pg.wait_for_timeout(2500)
    eb = await pg.inner_text(".eyebrow")
    check("D hero: greeting with name", "Priya Sharma" in eb, eb)
    hc = await pg.evaluate("[...document.querySelectorAll('.hero__char')].map(e=>getComputedStyle(e).transform)")
    check("D hero: name letters settled", all(t in ("none","matrix(1, 0, 0, 1, 0, 0)") for t in hc), str(set(hc))[:120])
    gampa = await pg.inner_text(".hero__line--outline")
    check("D hero: GAMPA scramble resolved", "GAMPA" in gampa, gampa)
    check("D layout: no horizontal overflow", await pg.evaluate("document.documentElement.scrollWidth <= innerWidth + 1"), str(await pg.evaluate("document.documentElement.scrollWidth")))

    # sound toggle
    t1 = await pg.inner_text(".sound-toggle"); await pg.click(".sound-toggle"); t2 = await pg.inner_text(".sound-toggle"); await pg.click(".sound-toggle"); t3 = await pg.inner_text(".sound-toggle")
    check("D sound toggle on→off→on", "on" in t1 and "off" in t2 and "on" in t3, f"{t1}/{t2}/{t3}")

    # nav links scroll to each section
    for sec in ["about","experience","projects","skills","shell","contact"]:
        await pg.click(f".nav__links a[href='#{sec}']")
        await pg.wait_for_timeout(2600)
        top = await top_of(pg, f"#{sec}")
        y = await pg.evaluate("scrollY")
        check(f"D nav → #{sec}", abs(y - top) < 40, f"scrollY={y:.0f} target={top:.0f}")
    await pg.click(".nav__logo"); await pg.wait_for_timeout(2600)
    check("D nav logo → top", await pg.evaluate("scrollY") < 40)

    # experience pin + horizontal motion
    et = await top_of(pg, "#experience")
    await pg.evaluate(f"window.scrollTo(0,{et+5})"); await pg.wait_for_timeout(1500)
    x1 = await pg.evaluate("new DOMMatrix(getComputedStyle(document.querySelector('.exp__track')).transform).m41")
    sec_top1 = await pg.evaluate("document.querySelector('#experience').getBoundingClientRect().top")
    intro_left = await pg.evaluate("document.querySelector('.exp__intro').getBoundingClientRect().left")
    check("D experience: intro visible at pin start", intro_left >= 0, f"left={intro_left:.0f}")
    await pg.evaluate(f"window.scrollTo(0,{et+1200})"); await pg.wait_for_timeout(1800)
    x2 = await pg.evaluate("new DOMMatrix(getComputedStyle(document.querySelector('.exp__track')).transform).m41")
    sec_top2 = await pg.evaluate("document.querySelector('#experience').getBoundingClientRect().top")
    check("D experience: pinned while scrolling", abs(sec_top1) < 5 and abs(sec_top2) < 5, f"{sec_top1:.0f},{sec_top2:.0f}")
    check("D experience: track moves horizontally", x2 < x1 - 300, f"{x1:.0f}→{x2:.0f}")
    # card hover: tilt + gsap don't fight (transform stable after hover settles)
    card = await pg.query_selector_all(".exp-card")
    bb = await card[1].bounding_box()
    await pg.mouse.move(bb["x"]+bb["width"]*0.8, bb["y"]+bb["height"]*0.3, steps=3); await pg.wait_for_timeout(2500)
    trA = await card[1].evaluate("e=>getComputedStyle(e).transform"); await pg.wait_for_timeout(300)
    trB = await card[1].evaluate("e=>getComputedStyle(e).transform")
    check("D experience card: tilt transform stable", trA == trB, f"{trA[:60]} vs {trB[:60]}")
    await pg.evaluate(f"window.scrollTo(0,{et+4000})"); await pg.wait_for_timeout(1500)
    end_vis = await pg.evaluate("(()=>{const r=document.querySelector('.exp__end').getBoundingClientRect();return r.right<=innerWidth+5 && r.left>=0})()")
    check("D experience: EOF card reachable at end", end_vis)

    # projects: sound per card start/stop
    for i, kind in enumerate(["retail","drone","rna"]):
        y = await pg.evaluate(f"document.querySelectorAll('.proj')[{i}].getBoundingClientRect().top+scrollY")
        await pg.evaluate(f"window.scrollTo(0,{y-100})"); await pg.wait_for_timeout(1300)
        bb = await (await pg.query_selector_all(".proj"))[i].bounding_box()
        o0 = await pg.evaluate("window.__osc")
        await pg.mouse.move(bb["x"]+bb["width"]*0.5, bb["y"]+bb["height"]*0.5, steps=4); await pg.wait_for_timeout(1200)
        playing = await pg.evaluate("document.querySelectorAll('.proj.is-playing').length")
        o1 = await pg.evaluate("window.__osc")
        await pg.mouse.move(5, 450, steps=3); await pg.wait_for_timeout(700)
        after = await pg.evaluate("document.querySelectorAll('.proj.is-playing').length")
        check(f"D project {kind}: hover plays + leave stops", playing == 1 and o1 > o0 and after == 0, f"playing={playing} osc+{o1-o0} after={after}")

    # skills globe: mount, single context, hover legend
    await pg.click(".nav__links a[href='#skills']"); await pg.wait_for_timeout(3500)
    n_can = await pg.evaluate("document.querySelectorAll('.skills__canvas canvas').length")
    ctx_before = await pg.evaluate("window.__ctxs.length")
    check("D skills: globe canvas mounted", n_can == 1, str(n_can))
    await pg.hover(".legend >> nth=2"); await pg.wait_for_timeout(400)
    check("D skills: legend hover highlights", await pg.evaluate("document.querySelectorAll('.legend.is-on').length") == 1)
    # scroll away & back several times → context count should stay bounded
    for _ in range(3):
        await pg.evaluate("window.scrollTo(0,0)"); await pg.wait_for_timeout(700)
        await pg.click(".nav__links a[href='#skills']"); await pg.wait_for_timeout(1800)
    nctx = await pg.evaluate("window.__ctxs.length")
    check("D skills: WebGL contexts not leaking on re-entry", nctx == ctx_before, f"{ctx_before} → {nctx}")

    # terminal
    await pg.click(".nav__links a[href='#shell']"); await pg.wait_for_timeout(2500)
    check("D terminal: prompt uses visitor name", "priyasharma@" in await pg.inner_text(".term__bar"))
    y0 = await pg.evaluate("scrollY")
    await pg.click(".term__body")
    await pg.wait_for_timeout(300)
    check("D terminal: clicking does not jump page", abs(await pg.evaluate("scrollY") - y0) < 5)
    for cmd, expect in [("help","available commands"),("whoami","RAMAKRISHNA"),("projects","Drone Noise"),("skills","Languages"),("contact","linkedin"),("sudo hire-me","access granted"),("foo","command not found")]:
        await pg.keyboard.type(cmd); await pg.keyboard.press("Enter"); await pg.wait_for_timeout(150)
        txt = await pg.inner_text(".term__body")
        check(f"D terminal: {cmd}", expect.lower() in txt.lower())
    await pg.keyboard.press("ArrowUp"); await pg.keyboard.press("ArrowUp")
    v = await pg.input_value(".term__form input")
    check("D terminal: history ↑", v == "sudo hire-me", v)
    await pg.fill(".term__form input", "clear"); await pg.keyboard.press("Enter"); await pg.wait_for_timeout(150)
    check("D terminal: clear", await pg.evaluate("document.querySelectorAll('.term__line').length") == 0)
    sb = await pg.evaluate("(()=>{const b=document.querySelector('.term__body');return b.scrollHeight>b.clientHeight?'overflow':'ok'})()")
    await pg.click("text=neofetch"); await pg.wait_for_timeout(200)
    check("D terminal: quick buttons", "Uptime" in await pg.inner_text(".term__body"))

    # contact
    await pg.click(".nav__links a[href='#contact']"); await pg.wait_for_timeout(2600)
    await pg.click(".contact__email"); await pg.wait_for_timeout(300)
    lab = await pg.inner_text(".contact__email")
    check("D contact: copy email feedback", "copied" in lab or "select" in lab, lab.split("\n")[0])
    hrefs = await pg.eval_on_selector_all(".contact__links a", "e=>e.map(a=>a.href)")
    check("D contact: links", any("linkedin.com" in h for h in hrefs) and any("github.com" in h for h in hrefs) and any(h.startswith("mailto:") for h in hrefs))
    fb = await pg.evaluate("(()=>{const r=document.querySelector('.footer').getBoundingClientRect();return r.bottom<=innerHeight+2})()")
    check("D contact: footer visible at page end", fb)

    # hero CTA anchors
    await pg.evaluate("window.scrollTo(0,0)"); await pg.wait_for_timeout(1200)
    await pg.click(".hero__ctas a[href='#projects']"); await pg.wait_for_timeout(2600)
    check("D hero CTA → projects", abs(await pg.evaluate("scrollY") - await top_of(pg, "#projects")) < 40)

    # resize
    await pg.set_viewport_size({"width":1024,"height":768}); await pg.wait_for_timeout(1500)
    check("D resize 1024: no horizontal overflow", await pg.evaluate("document.documentElement.scrollWidth <= innerWidth + 1"))
    await pg.set_viewport_size({"width":1440,"height":900}); await pg.wait_for_timeout(800)

    check("D console: no errors", not errs, " | ".join(errs)[:400])
    check("D console: no warnings", not warns, " | ".join(set(warns))[:400])
    await pg.close()

async def returning(b):
    ctx = await b.new_context(viewport={"width":1280,"height":800})
    pg = await ctx.new_page()
    await pg.goto(URL); await enter(pg, "Arjun", sound=False)
    await pg.reload()
    await pg.wait_for_selector("#visitor-name", timeout=60000); await pg.wait_for_timeout(500)
    v = await pg.input_value("#visitor-name"); lab = await pg.inner_text("label[for=visitor-name]")
    check("R returning visitor: name prefilled", v == "Arjun" and "welcome back" in lab, f"{v} / {lab}")
    await pg.fill("#visitor-name", ""); await pg.click("text=Enter silently")
    await pg.wait_for_timeout(1800)
    sp = await pg.evaluate("document.querySelector('.splash__name')?.getAttribute('aria-label')")
    check("R empty name: splash says friend", sp == "friend", str(sp))
    await pg.wait_for_selector(".splash", state="detached", timeout=30000)
    await pg.wait_for_timeout(1500)
    t = await pg.inner_text(".sound-toggle")
    check("R silent entry: sound off", "off" in t, t)
    y = await pg.evaluate("(()=>{const b=document.querySelectorAll('.proj__sound')[1].getBoundingClientRect();return b.top+scrollY})()")
    await pg.evaluate(f"window.scrollTo(0,{y-450})"); await pg.wait_for_timeout(1200)
    btn = (await pg.query_selector_all(".proj__sound button"))[1]
    check("R silent: project shows tap-to-hear", btn is not None)
    if btn:
        try:
            try:
                await btn.click(timeout=20000)
            except Exception as e:
                print("   click detail:", str(e)[:2500])
                raise
            await pg.wait_for_timeout(700)
            check("R tap-to-hear enables sound + plays", "on" in await pg.inner_text(".sound-toggle") and await pg.evaluate("document.querySelectorAll('.proj.is-playing').length")==1)
        except Exception as e:
            check("R tap-to-hear button clickable", False, str(e).split('\n')[0][:120])
    # skip splash by click
    await pg.reload(); await pg.wait_for_selector("#visitor-name", timeout=60000)
    await pg.click("text=Enter silently"); await pg.wait_for_selector(".preloader", state="detached", timeout=20000)
    import time
    t0 = time.time()
    await pg.mouse.click(700, 400)
    await pg.wait_for_selector(".splash", state="detached", timeout=20000)
    dt = time.time() - t0
    check("R splash: click to skip", dt < 3.0, f"gone {dt:.1f}s after click (auto-close is ~4.2s+0.9s)")
    await ctx.close()

async def mobile(b, p):
    dev = p.devices["iPhone 13"]
    ctx = await b.new_context(**{**dev})
    pg = await ctx.new_page()
    errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.on("console", lambda m: errs.append(m.text) if m.type=="error" else None)
    await pg.add_init_script(AUDIO_SPY)
    await pg.goto(URL)
    await enter(pg, "Kiran", sound=True)
    await pg.wait_for_timeout(1500)
    check("M layout: no horizontal overflow", await pg.evaluate("document.documentElement.scrollWidth <= innerWidth + 1"), str(await pg.evaluate("[document.documentElement.scrollWidth, innerWidth]")))
    # menu
    await pg.tap(".nav__burger"); await pg.wait_for_timeout(900)
    await pg.screenshot(path="/tmp/m-menu.png")
    bg = await pg.evaluate("(()=>{const m=document.querySelector('.mobile-menu');return m?getComputedStyle(m).backgroundColor:null})()")
    check("M menu opens with solid background", bg and "rgb(7, 8, 13)" in bg, str(bg))
    check("M burger becomes X", await pg.evaluate("document.querySelector('.nav__burger').classList.contains('is-open')"))
    await pg.tap(".mobile-menu a[href='#projects']"); await pg.wait_for_timeout(3000)
    check("M menu link → projects + closes", abs(await pg.evaluate("scrollY") - await top_of(pg, "#projects")) < 60 and await pg.evaluate("!document.querySelector('.mobile-menu')"), str(await pg.evaluate("scrollY")))
    # project tap sound then scroll away → must stop
    bb = await (await pg.query_selector_all(".proj"))[0].bounding_box()
    await pg.tap(".proj__body >> nth=0"); await pg.wait_for_timeout(800)
    p1 = await pg.evaluate("document.querySelectorAll('.proj.is-playing').length")
    await pg.evaluate("window.scrollBy(0, 2500)"); await pg.wait_for_timeout(1500)
    p2 = await pg.evaluate("document.querySelectorAll('.proj.is-playing').length")
    check("M project: tap plays, stops when scrolled away", p1 == 1 and p2 == 0, f"{p1}->{p2}")
    # touch-scroll through the skills globe (must not trap the page)
    st = await top_of(pg, "#skills")
    await pg.evaluate(f"window.scrollTo(0,{st+300})"); await pg.wait_for_timeout(1800)
    ta = await pg.evaluate("getComputedStyle(document.querySelector('.skills__canvas canvas')).touchAction")
    check("M skills globe: canvas allows vertical page scroll (touch-action)", ta in ("pan-y","auto","manipulation"), ta)
    # terminal input font >=16px (avoid iOS zoom)
    fs = await pg.evaluate("parseFloat(getComputedStyle(document.querySelector('.term__form input')).fontSize)")
    check("M terminal input ≥16px (no iOS zoom)", fs >= 16, str(fs))
    fs2 = await pg.evaluate("parseFloat(getComputedStyle(document.querySelector('#visitor-name')||document.body).fontSize)")
    await pg.screenshot(path="/tmp/m-end.png")
    check("M console: no errors", not errs, " | ".join(errs)[:300])
    await ctx.close()

async def reduced(b):
    ctx = await b.new_context(viewport={"width":1280,"height":800}, reduced_motion="reduce")
    pg = await ctx.new_page()
    errs=[]; pg.on("pageerror", lambda e: errs.append(str(e)))
    await pg.goto(URL); await enter(pg, "Lee", sound=False)
    await pg.click(".nav__links a[href='#contact']"); await pg.wait_for_timeout(1500)
    check("RM reduced motion: nav works", abs(await pg.evaluate("scrollY") - await top_of(pg, "#contact")) < 60)
    check("RM no errors", not errs, " | ".join(errs)[:300])
    await ctx.close()

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=ARGS)
        which = sys.argv[1:] or ["desktop","returning","mobile","reduced"]
        if "desktop" in which: await desktop(b)
        if "returning" in which: await returning(b)
        if "mobile" in which: await mobile(b, p)
        if "reduced" in which: await reduced(b)
        await b.close()
    fails = [r for r in results if not r[1]]
    print(f"\n{len(results)-len(fails)}/{len(results)} passed")
asyncio.run(main())

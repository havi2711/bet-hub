/* BET-Hub automated test suite.
   Paste into the browser console on the site (or inject it) and run:  await runBetTests()
   Returns one row per test: {id, module, title, pre, steps, expected, type, status, actual}.
   Manual tests (real microphone, speakers, other browsers) are listed with status "Not run". */
(() => {
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const q = s => document.querySelector(s);
  const qa = s => [...document.querySelectorAll(s)];
  const click = s => { const el = typeof s === "string" ? q(s) : s; if (!el) throw new Error("missing " + s); el.click(); };
  const setVal = (s, v, ev = "input") => { const el = q(s); el.value = v; el.dispatchEvent(new Event(ev, { bubbles: true })); };
  const lastCust = () => (qa("#sLog .msg.cust:not(.typing)").at(-1) || {}).dataset?.text || "";
  const toastText = () => q("#toast").textContent;
  let copied = null, spoken = [];

  async function startCall(ind, lvl, { opening } = {}) {
    showTab("cs"); click('#csTabs [data-sub="sim"]'); showSimStep(1);
    click(`[data-ind="${ind}"]`); click(`[data-p="${lvl}"]`);
    if (opening) setVal("#cfgOpening", opening);
    q("#cfgSpeak").checked = false; q("#cfgBlur").checked = false; q("#cfgEngine").value = "builtin";
    click("#simStart"); await wait(650);
  }
  async function say(text) {
    setVal("#sInput", text); click("#sSend");
    for (let i = 0; i < 60 && sim.s.busy; i++) await wait(50);
    await wait(60);
    return lastCust();
  }
  const ok = (cond, actual) => ({ ok: !!cond, actual: String(actual) });

  const T = [];
  const add = (id, module, title, pre, steps, expected, run) => T.push({ id, module, title, pre, steps, expected, type: run ? "Automated" : "Manual", run });

  /* ---------- General ---------- */
  add("GN-01", "General", "Top navigation shows exactly one module", "Site open", "Click each of the 5 top tabs", "Only the selected module panel is visible and its tab is highlighted", async () => {
    const res = [];
    for (const b of qa("#tabs button")) { b.click(); res.push(qa("[data-panel]").filter(p => !p.hidden).length === 1 && b.getAttribute("aria-selected") === "true"); }
    return ok(res.every(Boolean), res.join(","));
  });
  add("GN-02", "General", "Site is served securely and voice APIs exist", "Open the live URL in Chrome/Edge", "Check secure context, SpeechRecognition and speechSynthesis", "HTTPS secure context; both voice APIs available", async () =>
    ok(isSecureContext && !!(window.SpeechRecognition || window.webkitSpeechRecognition) && "speechSynthesis" in window, `secure=${isSecureContext}, SR=${!!(window.SpeechRecognition || window.webkitSpeechRecognition)}, TTS=${"speechSynthesis" in window}`));
  add("GN-03", "General", "All interface text is in English", "Site open", "Scan visible text of every module for Vietnamese diacritics", "No Vietnamese characters in the UI", async () => {
    const txt = qa("[data-panel], header, footer, .strip").map(e => e.textContent).join(" ");
    const m = txt.match(/[ăâđêôơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ]/gi);
    return ok(!m, m ? "found: " + [...new Set(m)].join("") : "none found");
  });

  /* ---------- Module 1: Email ---------- */
  add("EM-01", "Workplace Emails", "Default scenario renders a complete email", "Workplace Emails tab", "Open the tab with default values", "Subject 'Request for Deadline Extension: Q3 Market Research Analysis'; body starts 'Dear Ms. Sarah Jenkins'", async () => {
    showTab("email"); setVal("#emScenario", "deadline", "change");
    const t = q("#emOut").textContent;
    return ok(t.includes("Request for Deadline Extension: Q3 Market Research Analysis") && t.includes("Dear Ms. Sarah Jenkins"), t.slice(0, 90));
  });
  add("EM-02", "Workplace Emails", "Editing a field updates the live preview", "EM-01", "Change Recipient to 'Mr. Tom Baker'", "Preview greets 'Dear Mr. Tom Baker' immediately", async () => {
    setVal("#em_recipient", "Mr. Tom Baker"); return ok(q("#emOut").textContent.includes("Dear Mr. Tom Baker"), q("#emOut").textContent.slice(40, 100));
  });
  add("EM-03", "Workplace Emails", "Register switch changes tone", "EM-02", "Click 'Semi-formal (colleague)'", "Greeting becomes 'Hi …' and sign-off 'Thanks so much'", async () => {
    click('#emTone [data-tone="semi"]'); const t = q("#emOut").textContent; const r = ok(t.includes("Hi Mr. Tom Baker") && t.includes("Thanks so much"), t.slice(50, 110));
    click('#emTone [data-tone="formal"]'); return r;
  });
  add("EM-04", "Workplace Emails", "Every scenario and tone renders without gaps", "Workplace Emails tab", "Select each of the 4 scenarios in both tones", "No 'undefined' text; 6 glossary items each; highlight count matches marks", async () => {
    const bad = [];
    for (const k of Object.keys(EMAILS)) {
      setVal("#emScenario", k, "change");
      for (const tone of ["formal", "semi"]) {
        click(`#emTone [data-tone="${tone}"]`);
        const t = q("#emOut").textContent, marks = qa("#emOut mark.col").length;
        if (/undefined|\[\[|\*\*/.test(t) || qa("#emGloss div").length !== 6 || +q("#emHlN").textContent !== marks) bad.push(k + "/" + tone);
      }
    }
    click('#emTone [data-tone="formal"]'); setVal("#emScenario", "deadline", "change");
    return ok(!bad.length, bad.length ? "failed: " + bad.join(", ") : "8/8 combinations OK");
  });
  add("EM-05", "Workplace Emails", "Highlight toggle hides and shows collocations", "Workplace Emails tab", "Click 'Highlight collocations' twice", "Highlight turns off, then back on", async () => {
    click("#emHl"); const off = !q("#emOut").classList.contains("hlon"); click("#emHl"); const on = q("#emOut").classList.contains("hlon");
    return ok(off && on, `off=${off}, on=${on}`);
  });
  add("EM-06", "Workplace Emails", "User input is escaped (no HTML injection)", "Workplace Emails tab", "Type <img src=x onerror=alert(1)> into Recipient", "Text shows literally; no <img> element is created", async () => {
    setVal("#em_recipient", '<img src=x onerror="window.__xss=1">'); await wait(100);
    const r = ok(!q("#emOut img") && !window.__xss && q("#emOut").textContent.includes("<img"), `img=${!!q("#emOut img")}`);
    setVal("#emScenario", "deadline", "change"); return r;
  });
  add("EM-07", "Workplace Emails", "Copy email copies plain text with subject", "Workplace Emails tab", "Click 'Copy email'", "Clipboard text starts with 'Subject:' and has no [[ ]] or ** markers", async () => {
    copied = null; click("#emCopy"); await wait(100);
    return ok(copied && copied.startsWith("Subject:") && !/\[\[|\*\*/.test(copied), (copied || "").slice(0, 60));
  });

  /* ---------- Module 2: Meetings ---------- */
  add("MT-01", "Meetings", "Category filter shows only that function", "Meetings tab", "Click 'Disagreeing diplomatically'", "4 phrases shown, all from that category", async () => {
    showTab("meeting"); click('#mtCats [data-c="disagree"]'); const n = qa("#mtList article").length; click('#mtCats [data-c="all"]');
    return ok(n === 4 && qa("#mtList article").length === PHRASES.length, `disagree=${n}, all=${qa("#mtList article").length}`);
  });
  add("MT-02", "Meetings", "Add phrases to the script builder", "Meetings tab, builder empty", "Click '+ Add' on 2 phrases", "Builder lists the 2 phrases in order", async () => {
    click("#mtClear"); click('[data-add="0"]'); click('[data-add="4"]');
    const lines = qa("#mtBuilder .bline span").map(s => s.textContent);
    return ok(lines.length === 2 && lines[0] === PHRASES[0][2], lines.length + " lines");
  });
  add("MT-03", "Meetings", "Reorder and remove script lines", "MT-02", "Move line 2 up, then remove line 1", "Order swaps; removal leaves 1 line", async () => {
    click('[data-mv="1,-1"]'); const first = q("#mtBuilder .bline span").textContent; click('[data-rm="0"]');
    return ok(first === PHRASES[4][2] && qa("#mtBuilder .bline").length === 1, `first after move = phrase#4: ${first === PHRASES[4][2]}`);
  });
  add("MT-04", "Meetings", "Listen plays the whole script", "MT-03", "Click 'Listen to model pronunciation'", "Speech synthesis receives the script text", async () => {
    spoken = []; click("#mtPlay"); return ok(spoken.length === 1 && spoken[0] === PHRASES[0][2], spoken[0] || "nothing spoken");
  });
  add("MT-05", "Meetings", "Clear all empties the builder", "MT-03", "Click 'Clear all'", "Empty-state message is shown", async () => {
    click("#mtClear"); return ok(q("#mtBuilder .empty") && store.get("mtScript", null).length === 0, q("#mtBuilder").textContent.trim().slice(0, 40));
  });

  /* ---------- Module 3: Interviews ---------- */
  add("IV-01", "Interviews & Offers", "STAR requires all four boxes", "STAR tab, boxes empty", "Click 'Generate STAR answer' with empty boxes", "Warning toast; answer is not generated", async () => {
    showTab("interview"); ["#stS", "#stT", "#stA", "#stR"].forEach(s => q(s).value = ""); q("#stOut").classList.add("placeholder"); click("#stGo");
    return ok(q("#stOut").classList.contains("placeholder") && /fill in all four/i.test(toastText()), toastText());
  });
  add("IV-02", "Interviews & Offers", "STAR example builds a full answer", "STAR tab", "Click 'Fill example'", "Answer contains Situation…Result with 'As a result,'; word count and time shown", async () => {
    click("#stEx"); const t = q("#stOut").textContent;
    return ok(t.includes("As a result,") && t.includes("To achieve this,") && /words · ~\d+s/.test(q("#stStat").textContent), q("#stStat").textContent);
  });
  add("IV-03", "Interviews & Offers", "Elevator pitch updates and stays near 30 seconds", "Elevator Pitch tab", "Change name to 'Minh Nguyen', click Generate", "Pitch starts 'Hi, I'm Minh Nguyen'; 50–80 words", async () => {
    setVal("#epName", "Minh Nguyen"); click("#epGo"); const w = words(q("#epOut").textContent);
    const r = ok(q("#epOut").textContent.startsWith("Hi, I'm Minh Nguyen") && w >= 50 && w <= 80, w + " words"); setVal("#epName", "Linh Tran"); click("#epGo"); return r;
  });
  add("IV-04", "Interviews & Offers", "Negotiation script uses the offer values", "Negotiation tab", "Change target salary to '20,000,000 VND'", "Steps 2 and 3 mention 20,000,000 VND", async () => {
    setVal("#ngTarget", "20,000,000 VND"); const t = q("#ngScripts").textContent; const r = ok((t.match(/20,000,000 VND/g) || []).length >= 2, (t.match(/20,000,000 VND/g) || []).length + " mentions");
    setVal("#ngTarget", "17,500,000 VND"); return r;
  });

  /* ---------- Module 4a: Customer Service Principles ---------- */
  add("CP-01", "CS Principles", "Principles page structure", "Customer Service tab", "Open 'Customer Service Principles'", "Intro text, learning path, 4 L.A.S.T cards + Complete Example, all collapsed; Practice button present", async () => {
    showTab("cs"); click('#csTabs [data-sub="principles"]');
    const accs = qa("#lastAcc .acc"), closed = qa("#lastAcc .body").every(b => b.hidden);
    return ok(accs.length === 5 && closed && q("#goPractice") && /four essential steps/.test(q('[data-subpanel="principles"]').textContent), `${accs.length} cards, collapsed=${closed}`);
  });
  add("CP-02", "CS Principles", "Each card shows the full theory", "CP-01", "Expand each L, A, S, T card", "Definition, Key Actions, Useful Expressions, Example Scenario, Common Mistakes, Remember all present", async () => {
    const miss = [];
    for (let i = 0; i < 4; i++) {
      const b = q(`[data-acc="${i}"]`); b.click(); const body = b.nextElementSibling;
      for (const h of ["Definition", "Key Actions", "Useful Expressions", "Example Scenario", "Common Mistakes to Avoid", "Remember"]) if (body.hidden || !body.textContent.includes(h)) miss.push(THEORY[i].c.toUpperCase() + ":" + h);
    }
    return ok(!miss.length, miss.length ? miss.join(", ") : "4/4 cards complete");
  });
  add("CP-03", "CS Principles", "Cards collapse again", "CP-02", "Click each open card header", "All cards collapse; chevron state resets", async () => {
    for (let i = 0; i < 4; i++) q(`[data-acc="${i}"]`).click();
    return ok(qa("#lastAcc .body").every(b => b.hidden) && qa("[data-acc]").every(b => b.getAttribute("aria-expanded") === "false"), "collapsed");
  });
  add("CP-04", "CS Principles", "Complete example and checklist", "CP-01", "Expand 'Complete Example & Checklist'", "Shows [Listen][Apologize][Solve][Thank] reply, 'Why does this response work?', checklist, final tip", async () => {
    const b = q('[data-acc="full"]'); b.click(); const t = b.nextElementSibling.textContent; b.click();
    return ok(["[Listen]", "[Apologize]", "[Solve]", "[Thank]", "Why does this response work?", "Quick Reference Checklist", "Final tip"].every(x => t.includes(x)), "sections present");
  });
  add("CP-05", "CS Principles", "Learning path marks progress", "Fresh page", "Open a card, open the complete example, change a builder option", "Path steps 1, 2, 3 turn green in turn", async () => {
    const on = i => q(`#lastPath [data-p="${i}"]`).classList.contains("on");
    q('[data-acc="0"]').click(); q('[data-acc="0"]').click(); q('[data-acc="full"]').click(); q('[data-acc="full"]').click();
    const sel = q('[data-last="1"]'); sel.selectedIndex = 1; sel.dispatchEvent(new Event("change", { bubbles: true }));
    return ok(on(0) && on(1) && on(2), `1=${on(0)} 2=${on(1)} 3=${on(2)}`);
  });
  add("CP-06", "CS Principles", "Build a Response composes the reply", "CP-01", "Choose option 2 for Apologize", "Response block shows the chosen apology between Listen and Solve lines", async () => {
    const t = q("#lastOut").textContent; return ok(t.includes(LAST[1][3][1]) && t.startsWith("Your complete L.A.S.T response:"), t.slice(0, 50));
  });
  add("CP-07", "CS Principles", "Practice button opens the simulator", "CP-01", "Click 'Practice the L.A.S.T Framework'", "AI Voice Simulation tab opens at Step 1; path step 4 turns green", async () => {
    click("#goPractice"); await wait(50);
    return ok(!q('[data-subpanel="sim"]').hidden && !q("#simStep1").hidden && q('#lastPath [data-p="3"]').classList.contains("on"), "step1 visible");
  });

  /* ---------- Module 4b: Simulator setup ---------- */
  add("SS-01", "AI Simulator · Setup", "Step 1 lists the four industries", "CP-07", "View Step 1", "E-commerce & Retail, Software & SaaS (B2B), Logistics & Supply Chain, Hospitality & Events", async () => {
    const n = qa("#indCards .ind b").map(b => b.textContent); return ok(n.length === 4 && n.includes("Hospitality & Events"), n.join(" | "));
  });
  add("SS-02", "AI Simulator · Setup", "Choosing an industry opens Step 2", "Step 1", "Click 'Logistics & Supply Chain'", "Step 2 shows 3 personas (Emma, David, Richard) and the chosen industry name", async () => {
    click('[data-ind="logi"]'); const names = qa("#personaCards h4").map(h => h.textContent);
    return ok(!q("#simStep2").hidden && q("#indName").textContent === "Logistics & Supply Chain" && names.join() === "Emma,David,Richard", names.join());
  });
  add("SS-03", "AI Simulator · Setup", "Back arrow returns to Step 1", "Step 2", "Click the back arrow", "Step 1 is shown again", async () => {
    click("#back1"); return ok(!q("#simStep1").hidden && q("#simStep2").hidden, "step1 visible");
  });
  add("SS-04", "AI Simulator · Setup", "Complaint matches industry and level", "Step 1", "Choose Software & SaaS, then Richard", "Step 3 shows a SaaS complaint from the Demanding pool; badge shows industry and level", async () => {
    click('[data-ind="saas"]'); click('[data-p="hard"]');
    const iss = q("#cfgIssue").value, inPool = SCEN.saas.hard.some(s => s.issue === iss);
    return ok(!q("#simStep3").hidden && inPool && q("#caseBadge").textContent.includes("Software & SaaS"), iss);
  });
  add("SS-05", "AI Simulator · Setup", "Each new complaint differs from the previous one", "Step 3", "Click 'Generate another complaint' 20 times", "No two consecutive complaints are the same; all 3 in the pool appear", async () => {
    let prev = q("#cfgIssue").value, rep = 0; const seen = new Set([prev]);
    for (let i = 0; i < 20; i++) { click("#cfgNew"); const c = q("#cfgIssue").value; if (c === prev) rep++; seen.add(c); prev = c; }
    return ok(rep === 0 && seen.size === 3, `repeats=${rep}, distinct=${seen.size}`);
  });
  add("SS-06", "AI Simulator · Setup", "Voice defaults follow the persona", "Step 2", "Pick Emma, then Richard", "Emma: speed 1.00 / pitch 1.15. Richard: speed 1.10 / pitch 0.80", async () => {
    click("#back2"); click('[data-p="easy"]'); const e = [q("#cfgRate").value, q("#cfgPitch").value]; click("#back2"); click('[data-p="hard"]'); const r = [q("#cfgRate").value, q("#cfgPitch").value];
    return ok(+e[0] === 1 && +e[1] === 1.15 && +r[0] === 1.1 && +r[1] === .8, `Emma ${e}, Richard ${r}`);
  });
  add("SS-07", "AI Simulator · Setup", "Edited opening line is what the customer says", "Step 3", "Replace the opening line, start the call", "First customer message equals the edited text", async () => {
    await startCall("ecom", "easy", { opening: "Hello, this is a custom test complaint about my order." });
    return ok(lastCust() === "Hello, this is a custom test complaint about my order.", lastCust());
  });

  /* ---------- Module 4b: Simulator call ---------- */
  add("SM-01", "AI Simulator · Call", "Call starts with opening, timer and mood", "Step 3", "Click 'Start the call'", "Customer opening appears; ON CALL timer runs; mood meter at persona start (Richard 22)", async () => {
    await startCall("saas", "hard"); const t1 = q("#sTimer").textContent; await wait(1100);
    return ok(lastCust() === P().lines.opening && sim.s.mood === 22 && q("#sTimer").textContent !== t1 && !q("#sLive").hidden, `mood=${sim.s.mood}, timer ${t1}→${q("#sTimer").textContent}`);
  });
  add("SM-02", "AI Simulator · Call", "Greeting completes script Step 1", "SM-01", "Type 'Thank you for contacting CloudDesk. My name is Alex. How may I help you today?'", "Step 1 shows a tick; Step 2 is highlighted", async () => {
    await say(`Thank you for contacting ${P().company}. My name is Alex. How may I help you today?`);
    return ok(sim.s.covered.greet && q('.sstep[data-step="1"]').classList.contains("now"), "greet=" + !!sim.s.covered.greet);
  });
  add("SM-03", "AI Simulator · Call", "Demanding customer rejects a fix before empathy", "SM-02", "Type 'I will fix it right away.'", "Customer: 'Don't just jump to fixes…'; coach suggests acknowledging feelings", async () => {
    const r = await say("I will fix it right away."); return ok(/jump to fixes/i.test(r) && /acknowledge/i.test(q("#sCoach").textContent), r);
  });
  add("SM-04", "AI Simulator · Call", "Asking for the account number unlocks details", "SM-03", "Type 'I completely understand how frustrating this must be. May I have your account number?'", "Customer gives account details; case file shows facts", async () => {
    const r = await say("I completely understand how frustrating this must be. May I have your account number?");
    return ok(sim.s.detailsGiven && q("#sFacts").textContent.includes(P().detail.split(" · ")[0]), r.slice(0, 60));
  });
  add("SM-05", "AI Simulator · Call", "Demanding customer requires an apology", "SM-04", "Offer the fix without apologizing", "Customer complains there was no apology", async () => {
    const r = await say(P().fix + "."); return ok(/apology/i.test(r), r);
  });
  add("SM-06", "AI Simulator · Call", "Customer asks for an exact time when none is given", "SM-05", "Apologize, then repeat the fix with no time", "Customer asks for a specific time", async () => {
    sim.s.timelineGiven = false; // some scripted fixes already say "right now"; this step checks the no-time case
    await say("I sincerely apologize for the inconvenience this has caused you."); const r = await say("I'll arrange for our engineers to fix the problem.");
    return ok(/exact time|specific time|when/i.test(r), r);
  });
  add("SM-07", "AI Simulator · Call", "Demanding customer requires compensation", "SM-06", "Give the timeline only", "Customer demands compensation", async () => {
    const r = await say(P().timeline + "."); return ok(/compensation|losses|full price/i.test(r), r);
  });
  add("SM-08", "AI Simulator · Call", "Offering compensation resolves the issue", "SM-07", "Offer the compensation line", "Customer accepts; coach prompts Step 5", async () => {
    const r = await say(P().comp + "."); return ok(sim.s.resolved && /first useful thing/i.test(r), r);
  });
  add("SM-09", "AI Simulator · Call", "Thanking closes the call and opens the scorecard", "SM-08", "Type 'Thank you for your patience. Is there anything else I can help you with?'", "Customer says goodbye; scorecard ≥ 85 with all checklist items ticked", async () => {
    await say("Thank you for your patience. Is there anything else I can help you with?"); await wait(2900);
    const score = +q("#scRing text").textContent;
    return ok(!q("#simScore").hidden && score >= 85 && !q("#scCrit .no"), `score=${score}`);
  });
  add("SM-10", "AI Simulator · Call", "Rude reply lowers mood sharply", "New call, David", "Type 'Calm down, it's not my problem.'", "Mood drops by at least 25; customer reacts angrily", async () => {
    await startCall("hosp", "normal"); const m0 = sim.s.mood; const r = await say("Calm down, it's not my problem.");
    return ok(m0 - sim.s.mood >= 25, `mood ${m0}→${sim.s.mood}: ${r.slice(0, 50)}`);
  });
  add("SM-11", "AI Simulator · Call", "Customer hangs up when mood reaches zero", "SM-10", "Keep replying rudely", "Customer hangs up; 'The customer ended the call.'; input disabled", async () => {
    for (let i = 0; i < 4 && !sim.s.ended; i++) await say("Whatever, deal with it.");
    return ok(sim.s.ended && sim.s.kind === "fail" && q("#sInput").disabled, `ended=${sim.s.ended}, kind=${sim.s.kind}`);
  });
  add("SM-12", "AI Simulator · Call", "Empty reply is not sent", "New call", "Click Send with an empty box", "Toast 'Say or type a reply first'; no message added", async () => {
    await wait(2700); await startCall("ecom", "easy"); const n = qa("#sLog .msg").length; setVal("#sInput", "   "); click("#sSend"); await wait(80);
    return ok(qa("#sLog .msg").length === n && /say or type/i.test(toastText()), toastText());
  });
  add("SM-13", "AI Simulator · Call", "Script line can be inserted into the reply box", "SM-12", "Click the arrow next to a Step 1 line", "The line appears in the reply box", async () => {
    setVal("#sInput", ""); const b = q('.sstep.now [data-use]'); b.click();
    return ok(q("#sInput").value === b.dataset.use, q("#sInput").value.slice(0, 60));
  });
  add("SM-14", "AI Simulator · Call", "Enter sends, Shift+Enter does not", "SM-13", "Press Shift+Enter, then Enter", "Shift+Enter keeps the text; Enter sends it", async () => {
    const n = qa("#sLog .msg.agent").length, el = q("#sInput");
    el.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", shiftKey: true, bubbles: true })); await wait(50); const kept = qa("#sLog .msg.agent").length === n;
    el.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true })); for (let i = 0; i < 60 && sim.s.busy; i++) await wait(50);
    return ok(kept && qa("#sLog .msg.agent").length === n + 1, `kept=${kept}`);
  });
  add("SM-15", "AI Simulator · Call", "Hint shows the next script line", "SM-14", "Click 'Hint'", "Coach box shows 'Hint (Step 2): …'", async () => {
    click("#sHint"); return ok(/^Hint \(Step \d\)/.test(q("#sCoach span").textContent), q("#sCoach span").textContent.slice(0, 60));
  });
  add("SM-16", "AI Simulator · Call", "Agent text is escaped in the chat", "SM-15", "Send '<b>bold</b> I understand'", "Text shows literally; no <b> element in the bubble", async () => {
    await say("<b>bold</b> I understand"); const bub = qa("#sLog .msg.agent .bub").at(-1);
    return ok(!bub.querySelector("b") && bub.textContent.includes("<b>"), bub.innerHTML.slice(0, 40));
  });
  add("SM-17", "AI Simulator · Call", "Listening mode hides customer text until tapped", "New call with Listening mode on", "Start the call, tap the blurred bubble", "Bubble is blurred, then revealed after tap", async () => {
    showSimStep(3); q("#cfgBlur").checked = true; q("#cfgSpeak").checked = false; click("#simStart"); await wait(650);
    const m = qa("#sLog .msg.cust").at(-1), blurred = m.classList.contains("blur"); m.querySelector(".bub").click(); q("#cfgBlur").checked = false;
    return ok(blurred && !m.classList.contains("blur"), `blurred=${blurred}`);
  });
  add("SM-18", "AI Simulator · Call", "Ending the call early scores it as unresolved", "SM-17", "Click 'End call'", "Scorecard shows 'Issue not resolved' and coach feedback", async () => {
    click("#sEnd"); await wait(800);
    return ok(!q("#simScore").hidden && q("#scSub").textContent.includes("Issue not resolved") && qa("#scFeed .note").length > 0, q("#scSub").textContent.slice(0, 60));
  });
  add("SM-19", "AI Simulator · Call", "Retry keeps the complaint; new practice changes it", "SM-18", "Click 'Retry this complaint', end, then 'Practice a new complaint'", "Retry: same issue. New: different issue, same industry and level", async () => {
    const iss = issueText(); click("#scRetry"); await wait(650); const same = issueText() === iss; click("#sEnd"); await wait(800);
    click("#scAgain"); await wait(650); const diff = issueText() !== iss && SCEN[sim.ind][sim.key].some(s => s.issue === issueText());
    click("#sEnd"); await wait(800);
    return ok(same && diff, `retry same=${same}, new different=${diff}`);
  });
  add("SM-20", "AI Simulator · Call", "Turn limit ends a stalled call", "New call", "Send 14 neutral replies", "Customer gives up after 14 replies; call ends", async () => {
    await startCall("logi", "easy");
    for (let i = 0; i < 15 && !sim.s.ended; i++) await say("Let me check something on my system here.");
    return ok(sim.s.ended && sim.s.turn <= 14, `ended=${sim.s.ended} after ${sim.s.turn} replies`);
  });
  add("SM-21", "AI Simulator · Call", "All 36 complaints can be resolved with L.A.S.T", "Built-in engine", "For every industry × level × complaint, reply with greeting, empathy+apology, fix+timeline, compensation, thanks", "Every call ends successfully", async () => {
    const fails = [];
    for (const ind of Object.keys(SCEN)) for (const lv of Object.keys(SCEN[ind])) SCEN[ind][lv].forEach((sc, i) => {
      sim.ind = ind; sim.key = lv; const L = LEVELS[lv];
      sim.cur = { ...L, ...sc, ind, industry: INDUSTRIES[ind].name, company: INDUSTRIES[ind].company, lines: { ...L.lines, opening: sc.opening, details: [sc.details] } }; sim.edit = {};
      sim.s = { turn: 0, mood: L.mood, covered: {}, timelineGiven: false, compGiven: false, detailsGiven: false, resolved: false, ended: false, history: [], used: new Set(), rot: {}, moodTrail: [] };
      let end = null;
      for (const t of [`Thank you for contacting ${sim.cur.company}. My name is Alex. May I have your order number?`, "I completely understand how frustrating this must be, and I sincerely apologize.", sc.fix + ". " + sc.timeline + ".", sc.comp + ".", "Thank you for your patience. Is there anything else I can help you with?"]) { const r = evaluate(t); if (r.end) { end = r.end; break; } }
      if (end !== "success") fails.push(`${ind}/${lv}/${i}`);
    });
    return ok(!fails.length, fails.length ? "failed: " + fails.join(", ") : "36/36 resolved");
  });
  add("SM-22", "AI Simulator · Call", "Phrases taught in the theory are understood", "Built-in engine", "Analyze key expressions from the L.A.S.T cards", "'subject to our replacement policy' is not negative; 'frustrating' = empathy; 'escalate' = solution; 'compensate' = compensation", async () => {
    const a = analyze("We can arrange a replacement, subject to our replacement policy."), b = analyze("I can see why this would be frustrating."), c = analyze("I'll escalate this matter to our support manager."), d = analyze("We will compensate you for the losses.");
    return ok(!a.negative && b.empathy && c.solution && d.comp, `neg=${a.negative}, empathy=${b.empathy}, solution=${c.solution}, comp=${d.comp}`);
  });
  add("SM-23", "AI Simulator · Call", "Gemini failure falls back to the built-in engine", "Engine = Gemini with an invalid key", "Start a call, send a reply", "A notice explains Gemini didn't answer; the built-in customer still replies", async () => {
    await startCall("ecom", "normal"); q("#cfgEngine").value = "gemini"; const k = q("#cfgKey").value; q("#cfgKey").value = "invalid-test-key";
    const r = await say("I completely understand how frustrating this must be."); for (let i = 0; i < 100 && sim.s.busy; i++) await wait(100);
    const sys = qa("#sLog .msg.sys").map(m => m.textContent).join(" ");
    q("#cfgEngine").value = "builtin"; q("#cfgKey").value = k; click("#sEnd"); await wait(800);
    return ok(/Gemini didn't answer/.test(sys) && lastCust().length > 0, sys.slice(0, 90));
  });

  /* ---------- Module 5: Research ---------- */
  add("RS-01", "Thesis Research", "Quiz scores correct answers", "Thesis Research tab", "Choose all correct answers, submit", "Score 5/5; correct options highlighted green", async () => {
    showTab("research"); QUIZ.forEach(([, , a], i) => q(`input[name="qz${i}"][value="${a}"]`).checked = true); click("#qzSubmit");
    return ok(q("#qzScore").textContent === "Score: 5/5" && qa(".opt.right").length === 5, q("#qzScore").textContent);
  });
  add("RS-02", "Thesis Research", "Quiz marks wrong answers and explains", "RS-01", "Choose option 1 for every question, submit", "Wrong choices shown red; explanations visible; score reflects correct ones only", async () => {
    QUIZ.forEach((_, i) => q(`input[name="qz${i}"][value="0"]`).checked = true); click("#qzSubmit");
    const exp = QUIZ.filter(x => x[2] === 0).length;
    return ok(q("#qzScore").textContent === `Score: ${exp}/5` && qa(".opt.wrong").length === 5 - exp && qa(".expl").every(e => !e.hidden), q("#qzScore").textContent);
  });
  add("RS-03", "Thesis Research", "Incomplete survey is not saved", "Survey empty", "Rate only 1 statement, submit", "Toast 'Please rate every statement'; nothing saved", async () => {
    const n = store.get("survey", []).length; qa("#svTable input").forEach(i => i.checked = false); q('input[name="sv_PU1"][value="5"]').checked = true; click("#svSubmit");
    return ok(store.get("survey", []).length === n && /rate every/i.test(toastText()), toastText());
  });
  add("RS-04", "Thesis Research", "Complete survey saves and shows means", "RS-03", "Rate all 8 statements 4, submit", "Saved; PU/PEOU/CONF means shown; response count increases; form resets", async () => {
    const n = store.get("survey", []).length; SURVEY.forEach(([k]) => q(`input[name="sv_${k}"][value="4"]`).checked = true); click("#svSubmit");
    const r = ok(store.get("survey", []).length === n + 1 && !q("#svResult").hidden && qa("#svMeans b").length === 3 && !q("#svTable input:checked"), q("#svCount").textContent);
    return r;
  });
  add("RS-05", "Thesis Research", "Survey exports as CSV", "RS-04", "Click 'Copy all responses as CSV'", "Header 'timestamp,PU1,…,CONF2'; one row per response", async () => {
    copied = null; click("#svCsv"); await wait(100); const lines = (copied || "").split("\n");
    return ok(lines[0] === "timestamp," + SURVEY.map(s => s[0]).join(",") && lines.length === store.get("survey", []).length + 1, lines[0]);
  });

  /* ---------- Manual (need a person, microphone or another browser) ---------- */
  const M = (id, module, title, pre, steps, expected) => add(id, module, title, pre, steps, expected, null);
  M("MN-01", "Voice · Manual", "Microphone permission prompt", "Chrome/Edge, first visit", "Start a call, tap the mic", "Browser asks for microphone access; after Allow the mic turns red and pulses");
  M("MN-02", "Voice · Manual", "Speech is transcribed into the reply box", "MN-01", "Say 'I completely understand how frustrating this must be'", "Live 'Hearing: …' text appears; final words land in the reply box");
  M("MN-03", "Voice · Manual", "Auto-send after speaking", "Auto-send on", "Speak, then tap the mic again", "Reply is sent automatically and the customer answers");
  M("MN-04", "Voice · Manual", "Recording playback", "Record my voice on", "Speak a reply, then click 'Play my recording' on your bubble", "Your own voice plays back");
  M("MN-05", "Voice · Manual", "Customer speaks out loud", "Speakers on", "Start a call with 'Customer speaks out loud' on", "Opening line is read aloud; 'Replay' and 'Repeat last line' replay it");
  M("MN-06", "Voice · Manual", "Voice, speed and pitch settings", "Step 3", "Pick another voice, set speed 1.4 and pitch 0.6, click 'Preview voice'", "Preview uses the chosen voice, faster and lower");
  M("MN-07", "Voice · Manual", "Microphone denied", "Block mic in site settings", "Tap the mic", "Toast explains microphone access is needed; typing still works");
  M("MN-08", "Voice · Manual", "Browser without speech recognition", "Firefox", "Open the simulator", "Yellow note says speech recognition isn't available; calls work by typing");
  M("MN-09", "Voice · Manual", "Gemini engine with a valid free key", "Key from aistudio.google.com", "Select Gemini, paste key, run a call", "Customer replies are new, in character, 1–3 sentences; call ends with goodbye after L.A.S.T");
  M("MN-10", "Layout · Manual", "Phone layout", "Phone or 375px wide window", "Open every module", "No sideways scrolling; simulator stacks chat above script; buttons reachable");
  M("MN-11", "Layout · Manual", "Dark mode", "OS set to dark mode", "Open every module", "Dark background with readable text; no white blocks");

  window.runBetTests = async function () {
    const origCopy = window.copyText, origSpeak = TTS.speak;
    try { copyText = t => { copied = t; }; } catch {}
    TTS.speak = (t, o) => { spoken.push(t); o && o.onend && o.onend(); };
    const surveyBefore = store.get("survey", []), scriptBefore = store.get("mtScript", []);
    const out = [];
    for (const t of T) {
      const row = { id: t.id, module: t.module, title: t.title, pre: t.pre, steps: t.steps, expected: t.expected, type: t.type };
      if (!t.run) { out.push({ ...row, status: "Not run", actual: "Needs a person with microphone/speakers or another browser" }); continue; }
      try { const r = await t.run(); out.push({ ...row, status: r.ok ? "Pass" : "Fail", actual: r.actual }); }
      catch (e) { out.push({ ...row, status: "Fail", actual: "Error: " + e.message }); }
    }
    store.set("survey", surveyBefore); store.set("mtScript", scriptBefore); svShow(); mt.script = scriptBefore; mtBuild();
    try { copyText = origCopy; } catch {}
    TTS.speak = origSpeak; showTab("email");
    return out;
  };
})();

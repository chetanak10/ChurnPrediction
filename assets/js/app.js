
const AUTH = {
  guard(){
    const t = localStorage.getItem('cs_teacher');
    if(!t){ window.location.replace('index.html'); }
  },
  logout(){
    localStorage.removeItem('cs_teacher');
    window.location.href='index.html';
  },
  teacher(){
    return JSON.parse(localStorage.getItem('cs_teacher')||'{}');
  }
};

const Util = {
  pct(v){ return Math.round(v*100)+'%'; },
  badge(b){
    return `<span class="badge ${b}">${b.toUpperCase()}</span>`;
  },
  fmtCost(c){ return c===0?'Free': (c===1?'Low':'Moderate'); },
  saveStudents(list){ localStorage.setItem('cs_students', JSON.stringify(list)); },
  getStudents(){ return JSON.parse(localStorage.getItem('cs_students')||'[]'); },
  findStudent(id){ return Util.getStudents().find(s=>s.id===id); },
  updateStudent(obj){
    const all = Util.getStudents().map(s=> s.id===obj.id? obj : s);
    Util.saveStudents(all);
  },
  queryParam(key){
    const url = new URL(window.location.href);
    return url.searchParams.get(key);
  }
};

const Dashboard = {
  cache: { filtered: [] },
  render(){
    this.drawChart();
    this.renderGrid(Util.getStudents());
  },
  filter(){
    const q = document.getElementById('search').value.toLowerCase();
    const rf = document.getElementById('riskFilter').value;
    const gf = document.getElementById('gradeFilter').value;

    const filtered = Util.getStudents().filter(s=>{
      const searchHit = !q || s.name.toLowerCase().includes(q) || s.grade.toLowerCase().includes(q);
      const riskHit = !rf || s.riskBand===rf;
      const gradeHit = !gf || s.grade===gf;
      return searchHit && riskHit && gradeHit;
    });
    this.renderGrid(filtered);
  },
  renderGrid(list){
    this.cache.filtered = list;
    const grid = document.getElementById('studentsGrid');
    grid.innerHTML = list.map(s=>`
      <div class="student-card">
        <div class="row">
          <h4>${s.name}</h4>
          ${Util.badge(s.riskBand)}
        </div>
        <div class="meta">${s.grade} • Risk: ${s.riskScore}</div>
        <div class="kv">
          <b>Top Reasons</b> <span>${s.reasons.map(r=>r.label).join(', ')}</span>
          <b>Next Activity</b> <span>${s.nextActivity.topic} — ${s.nextActivity.type} (${s.nextActivity.estMins}m)</span>
          <b>Suggested</b> <span>${s.suggestedIntervention.action} (${Util.fmtCost(s.suggestedIntervention.cost)})</span>
        </div>
        <div class="actions">
          <a class="btn" href="student.html?id=${s.id}">Open</a>
          <button class="btn" onclick="Dashboard.override('${s.id}')">Override</button>
        </div>
      </div>
    `).join('');
  },
  override(id){
    const s = Util.findStudent(id);
    const choice = prompt('Override intervention (SMS, Reminder, Mentor Call):', s.suggestedIntervention.action);
    if(!choice) return;
    s.suggestedIntervention.action = choice;
    s.history.unshift({ ts: new Date().toISOString(), action: 'OVERRIDE', details: `Teacher set intervention to ${choice}` });
    Util.updateStudent(s);
    this.filter();
  },
  drawChart(){
    const ctx = document.getElementById('riskChart');
    const all = Util.getStudents();
    const bands = { high:0, medium:0, low:0 };
    all.forEach(s=>bands[s.riskBand]++);
    new Chart(ctx, {
      type:'bar',
      data:{ labels:['High','Medium','Low'], datasets:[{ label:'Students', data:[bands.high,bands.medium,bands.low] }] },
      options:{ plugins:{ legend:{display:false} }, scales:{ y:{ beginAtZero:true, ticks:{ precision:0 } } } }
    });
  }
};

const StudentPage = {
  render(){
    const id = Util.queryParam('id');
    const s = Util.findStudent(id);
    if(!s){ document.body.innerHTML='<main class="container"><div class="card">Student not found.</div></main>'; return;}
    document.getElementById('studentHeader').innerHTML = `
      <div class="flex-between">
        <div>
          <h2>${s.name} ${Util.badge(s.riskBand)}</h2>
          <div class="meta">${s.grade} • Risk Score: ${s.riskScore}</div>
        </div>
        <div class="kv" style="min-width:280px">
          <b>Attendance</b> <span>${Util.pct(s.metrics.attendanceRate)}</span>
          <b>On-Time Assignments</b> <span>${Util.pct(s.metrics.assignmentsOnTime)}</span>
          <b>Weekly Logins</b> <span>${s.metrics.weeklyLogins}</span>
          <b>Inactivity</b> <span>${s.metrics.inactivityDays} days</span>
        </div>
      </div>
    `;

    document.getElementById('reasons').innerHTML = `
      <table class="table">
        <thead><tr><th>Reason</th><th>Importance</th></tr></thead>
        <tbody>${s.reasons.map(r=>`<tr><td>${r.label}</td><td>${Math.round(r.weight*100)}%</td></tr>`).join('')}</tbody>
      </table>
      <div class="alert small muted">These are teacher‑friendly explanations derived from attendance, assignments, logins, and inactivity.</div>
    `;

    document.getElementById('nextActivity').innerHTML = `
      <div class="kv">
        <b>Topic</b> <span>${s.nextActivity.topic}</span>
        <b>Type</b> <span>${s.nextActivity.type}</span>
        <b>Estimated Time</b> <span>${s.nextActivity.estMins} minutes</span>
        <b>Objective</b> <span>${s.nextActivity.objective}</span>
      </div>
      <div class="actions">
        <button class="btn" onclick="StudentPage.markActivityDone('${s.id}')">Mark as Done</button>
        <button class="btn" onclick="StudentPage.snoozeActivity('${s.id}')">Snooze</button>
      </div>
    `;

    document.getElementById('intervention').innerHTML = `
      <div class="kv">
        <b>Suggested</b> <span>${s.suggestedIntervention.action}</span>
        <b>Cost</b> <span>${Util.fmtCost(s.suggestedIntervention.cost)}</span>
        <b>Engagement State</b> <span>${s.suggestedIntervention.state}</span>
      </div>
      <div class="actions">
        <button class="btn" onclick="StudentPage.override('${s.id}')">Override</button>
        <button class="btn" onclick="StudentPage.feedback('${s.id}')">Give Feedback</button>
      </div>
    `;

    this.drawActivityChart(s);
    this.renderHistory(s);
  },
  drawActivityChart(s){
    const ctx = document.getElementById('activityChart');
    new Chart(ctx, {
      type:'line',
      data:{
        labels:['W1','W2','W3','W4','W5','W6'],
        datasets:[
          { label:'Attendance', data:[70,80,65,85,90,Math.round(s.metrics.attendanceRate*100)] },
          { label:'On-time Assignments', data:[60,62,55,68,72,Math.round(s.metrics.assignmentsOnTime*100)] }
        ]
      },
      options:{ plugins:{ legend:{position:'bottom'} }, scales:{ y:{ beginAtZero:true, max:100 } } }
    });
  },
  renderHistory(s){
    const el = document.getElementById('history');
    if(!s.history.length){
      el.innerHTML = '<p class="muted small">No interventions yet. Use the buttons above to take action and record outcomes.</p>';
      return;
    }
    el.innerHTML = `
      <table class="table">
        <thead><tr><th>When</th><th>Action</th><th>Details</th></tr></thead>
        <tbody>${s.history.map(h=>`<tr><td>${new Date(h.ts).toLocaleString()}</td><td>${h.action}</td><td>${h.details||''}</td></tr>`).join('')}</tbody>
      </table>
    `;
  },
  sendIntervention(kind){
    const id = Util.queryParam('id');
    const s = Util.findStudent(id);
    s.history.unshift({ ts: new Date().toISOString(), action: kind, details: 'Queued via dashboard (demo only)' });
    s.suggestedIntervention.action = kind;
    Util.updateStudent(s);
    this.render();
    alert(kind+' has been recorded (demo).');
  },
  override(id){
    const s = Util.findStudent(id);
    const choice = prompt('Override intervention (SMS, Reminder, Mentor Call):', s.suggestedIntervention.action);
    if(!choice) return;
    s.suggestedIntervention.action = choice;
    s.history.unshift({ ts: new Date().toISOString(), action: 'OVERRIDE', details: `Teacher set intervention to ${choice}` });
    Util.updateStudent(s);
    this.render();
  },
  feedback(id){
    const s = Util.findStudent(id);
    const fb = prompt('Enter feedback on suggestion quality (e.g., helpful / not helpful / reason):');
    if(!fb) return;
    s.history.unshift({ ts: new Date().toISOString(), action: 'FEEDBACK', details: fb });
    Util.updateStudent(s);
    this.render();
  },
  markActivityDone(id){
    const s = Util.findStudent(id);
    s.history.unshift({ ts: new Date().toISOString(), action: 'ACTIVITY_DONE', details: `${s.nextActivity.topic} — ${s.nextActivity.type}` });
    Util.updateStudent(s);
    alert('Marked complete (demo).');
  },
  snoozeActivity(id){
    const s = Util.findStudent(id);
    s.history.unshift({ ts: new Date().toISOString(), action: 'ACTIVITY_SNOOZE', details: `${s.nextActivity.topic}` });
    Util.updateStudent(s);
    alert('Snoozed (demo).');
  }
};

const Profile = {
  render(){
    const t = AUTH.teacher();
    document.getElementById('name').value = t.name || '';
    document.getElementById('school').value = t.school || '';
    document.getElementById('grades').value = t.grades || '';
    document.getElementById('prefs').value = t.prefs || '';
    document.getElementById('profileForm').addEventListener('submit', this.save);
    this.usage();
  },
  save(e){
    e.preventDefault();
    const teacher = {
      ...AUTH.teacher(),
      name: document.getElementById('name').value,
      school: document.getElementById('school').value,
      grades: document.getElementById('grades').value,
      prefs: document.getElementById('prefs').value
    };
    localStorage.setItem('cs_teacher', JSON.stringify(teacher));
    alert('Saved.');
  },
  usage(){
    const all = Util.getStudents();
    const counts = { SMS:0, Reminder:0, 'Mentor Call':0 };
    all.forEach(s=> s.history.forEach(h=>{ if(counts[h.action]!=null) counts[h.action]++; }));
    document.getElementById('usage').innerHTML = `
      <table class="table">
        <thead><tr><th>Intervention</th><th>Times Used</th></tr></thead>
        <tbody>
          <tr><td>SMS</td><td>${counts['SMS']}</td></tr>
          <tr><td>Reminder</td><td>${counts['Reminder']}</td></tr>
          <tr><td>Mentor Call</td><td>${counts['Mentor Call']}</td></tr>
        </tbody>
      </table>
      <div class="actions">
        <button class="btn" onclick="Profile.reset()">Reset Demo Data</button>
      </div>
    `;
  },
  reset(){
    localStorage.removeItem('cs_students');
    location.reload();
  }
};

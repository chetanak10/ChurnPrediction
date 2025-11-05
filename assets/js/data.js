
// Mock data & simple heuristics. In production, replace with backend APIs.
window.DEMO_AUTH = {
  bootstrapTeacher(email){
    const teacher = JSON.parse(localStorage.getItem('cs_teacher')) || {};
    return { ...teacher, email, name: teacher.name || 'Demo Teacher', school: teacher.school || 'Community School', prefs: teacher.prefs || 'SMS, Reminder', grades: teacher.grades || '6,7,8' };
  }
};

window.MockDB = (function(){
  const existing = JSON.parse(localStorage.getItem('cs_students'));
  if(existing){ return { students: existing }; }

  const students = [
    // id, name, grade, attendanceRate, assignmentsOnTime, weeklyLogins, inactivityDays
    ['S001','Aarav Kumar','Grade 6', 0.82, 0.55, 3, 6],
    ['S002','Zoya Khan','Grade 7', 0.91, 0.78, 5, 2],
    ['S003','Ishaan Patel','Grade 8', 0.68, 0.40, 2, 12],
    ['S004','Meera Singh','Grade 6', 0.74, 0.50, 2, 10],
    ['S005','Aditya Verma','Grade 7', 0.95, 0.92, 6, 1],
    ['S006','Riya Sharma','Grade 8', 0.71, 0.45, 1, 14],
    ['S007','Kabir Das','Grade 7', 0.88, 0.60, 4, 4],
    ['S008','Sara Ali','Grade 6', 0.77, 0.62, 3, 5],
    ['S009','Vikram Rao','Grade 8', 0.83, 0.70, 4, 3],
    ['S010','Neha Gupta','Grade 7', 0.58, 0.35, 1, 16]
  ].map(([id,name,grade,att,assn,logins,inact])=>{
    const riskScore = Math.round((1 - (0.5*att + 0.3*assn + 0.2*(logins/7))) * 100);
    const riskBand = riskScore >= 70 ? 'high' : riskScore >= 40 ? 'medium' : 'low';
    const reasons = [
      { label: 'Low Attendance', weight: Math.max(0, 1-att) },
      { label: 'Missed Assignments', weight: Math.max(0, 1-assn) },
      { label: 'Low Weekly Logins', weight: Math.max(0, 1-(logins/7)) },
      { label: 'Inactivity (days)', weight: Math.min(1, inact/14) }
    ].sort((a,b)=>b.weight-a.weight).slice(0,3);

    const topics = ['Fractions','Decimals','Algebra Basics','Geometry','Data & Graphs'];
    const nextTopic = topics[(riskScore + id.length) % topics.length];
    const nextActivity = { topic: nextTopic, type: 'Practice Set', estMins: 20, objective: 'Reinforce fundamentals with spaced repetition.' };

    const suggested = riskBand==='high' ? 'Mentor Call' : (riskBand==='medium' ? 'SMS' : 'Reminder');
    const cost = suggested==='Mentor Call' ? 3 : (suggested==='SMS' ? 1 : 0);

    return {
      id, name, grade,
      metrics:{ attendanceRate:att, assignmentsOnTime:assn, weeklyLogins:logins, inactivityDays:inact },
      riskScore, riskBand, reasons,
      nextActivity, suggestedIntervention: {action: suggested, cost, state: logins>3?'Engaged':'At-Risk'},
      history: []
    };
  });

  localStorage.setItem('cs_students', JSON.stringify(students));
  return { students };
})();

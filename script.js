// ---------- Data ----------
var exam = { name: "", date: "" };
var rooms = [];     // {name, rows, cols}
var students = [];  // {roll, name, cls}
var plan = [];      // {room, rows, cols, seats: [student or null]}

// ---------- Helpers ----------
function $(id) { return document.getElementById(id); }

function save() {
  try {
    localStorage.setItem("seatData", JSON.stringify({ exam: exam, rooms: rooms, students: students, plan: plan }));
  } catch (e) { console.log("Could not save"); }
}

function load() {
  try {
    var d = JSON.parse(localStorage.getItem("seatData"));
    if (d) { exam = d.exam; rooms = d.rooms; students = d.students; plan = d.plan; }
  } catch (e) { console.log("Nothing saved"); }
}

function showMsg(id, text, ok) {
  var el = $(id);
  el.textContent = text;
  el.className = "msg " + (ok ? "ok" : "bad");
}

function shuffle(arr) {
  for (var i = arr.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var temp = arr[i]; arr[i] = arr[j]; arr[j] = temp;
  }
}

function classList() {
  var names = [];
  students.forEach(function (s) { if (names.indexOf(s.cls) === -1) names.push(s.cls); });
  return names;
}

function colorOf(cls) {
  var hue = (classList().indexOf(cls) * 67) % 360;
  return "hsl(" + hue + ", 70%, 85%)";
}

function totalSeats() {
  var t = 0;
  rooms.forEach(function (r) { t += r.rows * r.cols; });
  return t;
}

// ---------- Rooms ----------
function showRooms() {
  var html = "";
  rooms.forEach(function (r, i) {
    html += "<li>" + r.name + " - " + r.rows + " rows x " + r.cols + " seats = " + (r.rows * r.cols) +
            " seats <button class='small danger' onclick='deleteRoom(" + i + ")'>Delete</button></li>";
  });
  if (rooms.length === 0) html = "<li class='empty'>No rooms added yet.</li>";
  $("roomList").innerHTML = html + "<li><b>Total capacity: " + totalSeats() + "</b></li>";
}

function deleteRoom(i) {
  rooms.splice(i, 1);
  plan = [];
  save(); showRooms(); showPlan(); showReport();
}

$("examForm").addEventListener("submit", function (e) {
  e.preventDefault();
  exam.name = $("examName").value.trim();
  exam.date = $("examDate").value;
  save(); showPlan();
  showMsg("roomMsg", "Exam saved.", true);
});

$("roomForm").addEventListener("submit", function (e) {
  e.preventDefault();
  var name = $("roomName").value.trim();
  var rows = Number($("roomRows").value);
  var cols = Number($("roomCols").value);
  for (var i = 0; i < rooms.length; i++) {
    if (rooms[i].name.toLowerCase() === name.toLowerCase()) {
      showMsg("roomMsg", "This room already exists.", false);
      return;
    }
  }
  rooms.push({ name: name, rows: rows, cols: cols });
  plan = [];
  save(); showRooms(); showPlan();
  showMsg("roomMsg", "Room added.", true);
  $("roomForm").reset();
  $("roomRows").value = 5; $("roomCols").value = 6;
});

// ---------- Students ----------
function showStudents() {
  var html = "";
  students.forEach(function (s, i) {
    html += "<tr><td>" + s.roll + "</td><td>" + s.name + "</td><td>" + s.cls + "</td><td>" +
      "<button class='small light' onclick='editStudent(" + i + ")'>Edit</button> " +
      "<button class='small danger' onclick='deleteStudent(" + i + ")'>Delete</button></td></tr>";
  });
  if (students.length === 0) html = "<tr><td colspan='4' class='empty'>No students yet.</td></tr>";
  $("studentBody").innerHTML = html;
}

function rollExists(roll) {
  return students.some(function (s) { return s.roll.toLowerCase() === roll.toLowerCase(); });
}

$("studentForm").addEventListener("submit", function (e) {
  e.preventDefault();
  var roll = $("roll").value.trim();
  if (rollExists(roll)) {
    showMsg("studentMsg", "Roll number " + roll + " is already added.", false);
    return;
  }
  students.push({ roll: roll, name: $("sname").value.trim(), cls: $("cls").value.trim() });
  plan = [];
  save(); showStudents(); showPlan(); showReport();
  showMsg("studentMsg", "Student added. Total: " + students.length, true);
  $("roll").value = ""; $("sname").value = "";
  $("roll").focus();
});

function deleteStudent(i) {
  students.splice(i, 1);
  plan = [];
  save(); showStudents(); showPlan(); showReport();
}

function editStudent(i) {
  var newName = prompt("Student name:", students[i].name);
  if (newName === null) return;
  var newCls = prompt("Class / Subject:", students[i].cls);
  if (newCls === null) return;
  students[i].name = newName.trim() || students[i].name;
  students[i].cls = newCls.trim() || students[i].cls;
  plan = [];
  save(); showStudents(); showPlan(); showReport();
  showMsg("studentMsg", "Student updated. Generate the plan again.", true);
}

$("sampleBtn").addEventListener("click", function () {
  var classes = ["BCA-A", "BCA-B", "BTech-CSE"];
  var names = ["Aman", "Riya", "Karan", "Simran", "Rohit", "Neha", "Arjun", "Pooja", "Vikram", "Anjali"];
  rooms = [{ name: "Room 101", rows: 5, cols: 6 }, { name: "Room 102", rows: 5, cols: 6 }];
  students = [];
  classes.forEach(function (c, ci) {
    for (var n = 0; n < names.length; n++) {
      students.push({ roll: (ci + 1) * 100 + n + 1 + "", name: names[n] + " " + c, cls: c });
    }
  });
  plan = [];
  save(); showAll();
  showMsg("studentMsg", "Sample data loaded (30 students, 2 rooms).", true);
});

$("clearBtn").addEventListener("click", function () {
  if (!confirm("Delete all rooms, students and the plan?")) return;
  rooms = []; students = []; plan = []; exam = { name: "", date: "" };
  save(); showAll();
});

// ---------- Allocation ----------
function generatePlan() {
  if (rooms.length === 0 || students.length === 0) {
    showMsg("genMsg", "Add at least one room and one student first.", false);
    return;
  }
  if (students.length > totalSeats()) {
    showMsg("genMsg", "Not enough seats: " + students.length + " students but only " + totalSeats() + " seats. Add another room.", false);
    return;
  }

  // group students by class
  var groups = {};
  students.forEach(function (s) {
    if (!groups[s.cls]) groups[s.cls] = [];
    groups[s.cls].push(s);
  });
  var names = Object.keys(groups);
  var single = names.length === 1;

  if (single) {
    groups[names[0]].sort(function (a, b) { return a.roll.localeCompare(b.roll, undefined, { numeric: true }); });
  } else {
    names.forEach(function (n) { shuffle(groups[n]); });
  }

  plan = [];
  rooms.forEach(function (r) {
    var seats = [];
    for (var i = 0; i < r.rows * r.cols; i++) {
      var row = Math.floor(i / r.cols);
      var col = i % r.cols;
      var left = col > 0 ? seats[i - 1] : null;
      var up = row > 0 ? seats[i - r.cols] : null;

      // pick the class with most students left, avoiding left and front neighbours
      var best = null, bestScore = -Infinity;
      names.forEach(function (n) {
        if (groups[n].length === 0) return;
        var score = groups[n].length + Math.random();
        if (left && left.cls === n) score -= 1000;
        if (up && up.cls === n) score -= 500;
        if (score > bestScore) { bestScore = score; best = n; }
      });
      seats.push(best ? groups[best].shift() : null);
    }
    plan.push({ room: r.name, rows: r.rows, cols: r.cols, seats: seats });
  });

  save(); showPlan(); showReport();
  showMsg("genMsg", single ? "Plan created in roll number order (single class)." : "Plan created with mixed classes.", true);
  location.hash = "plan";
}

$("genBtn").addEventListener("click", generatePlan);
$("printBtn").addEventListener("click", function () { window.print(); });

// ---------- Show plan ----------
function clashAt(p, i) {
  var s = p.seats[i];
  if (!s) return false;
  var col = i % p.cols;
  var left = col > 0 ? p.seats[i - 1] : null;
  var up = i - p.cols >= 0 ? p.seats[i - p.cols] : null;
  return (left && left.cls === s.cls) || (up && up.cls === s.cls);
}

function showPlan(highlightRoll) {
  if (plan.length === 0) {
    $("planOut").innerHTML = "<p class='empty'>No plan yet. Add rooms and students, then press Generate.</p>";
    $("legend").innerHTML = "";
    return;
  }
  var title = exam.name ? "<h3>" + exam.name + (exam.date ? " - " + exam.date : "") + "</h3>" : "";
  var legend = "";
  classList().forEach(function (c) {
    legend += "<span class='tag' style='--c:" + colorOf(c) + "'>" + c + "</span>";
  });
  $("legend").innerHTML = legend;

  var html = title;
  plan.forEach(function (p) {
    html += "<div class='room'><h3>" + p.room + "</h3><div class='grid' style='grid-template-columns: repeat(" + p.cols + ", 1fr)'>";
    p.seats.forEach(function (s, i) {
      if (!s) { html += "<div class='seat empty-seat'>Empty</div>"; return; }
      var cl = "seat" + (clashAt(p, i) ? " clash" : "") + (s.roll === highlightRoll ? " found" : "");
      html += "<div class='" + cl + "' style='--c:" + colorOf(s.cls) + "' title='" + s.name + " (" + s.cls + ")'>" +
              "<b>" + s.roll + "</b>" + s.name + "</div>";
    });
    html += "</div></div>";
  });
  $("planOut").innerHTML = html;
}

// ---------- Search ----------
function findSeat(roll) {
  for (var a = 0; a < plan.length; a++) {
    for (var b = 0; b < plan[a].seats.length; b++) {
      var s = plan[a].seats[b];
      if (s && s.roll.toLowerCase() === roll.toLowerCase()) {
        return { p: a, i: b, student: s };
      }
    }
  }
  return null;
}

$("searchBox").addEventListener("input", function () {
  var text = $("searchBox").value.trim().toLowerCase();
  if (text === "") { $("searchOut").innerHTML = ""; showPlan(); return; }
  if (plan.length === 0) { $("searchOut").innerHTML = "<p class='empty'>Generate a plan first.</p>"; return; }
  var html = "", firstRoll = "";
  plan.forEach(function (p) {
    p.seats.forEach(function (s, i) {
      if (s && (s.roll.toLowerCase() === text || s.name.toLowerCase().indexOf(text) !== -1)) {
        var row = Math.floor(i / p.cols) + 1, seat = (i % p.cols) + 1;
        html += "<p><b>" + s.name + "</b> (Roll " + s.roll + ", " + s.cls + "): " + p.room + ", Row " + row + ", Seat " + seat + "</p>";
        if (!firstRoll) firstRoll = s.roll;
      }
    });
  });
  $("searchOut").innerHTML = html || "<p class='msg bad'>No student found.</p>";
  showPlan(firstRoll);
});

// ---------- Admin swap ----------
$("swapForm").addEventListener("submit", function (e) {
  e.preventDefault();
  var a = findSeat($("swap1").value.trim());
  var b = findSeat($("swap2").value.trim());
  if (!a || !b) { showMsg("swapMsg", "One of the roll numbers was not found in the plan.", false); return; }
  var temp = plan[a.p].seats[a.i];
  plan[a.p].seats[a.i] = plan[b.p].seats[b.i];
  plan[b.p].seats[b.i] = temp;
  save(); showPlan(); showReport();
  showMsg("swapMsg", "Seats swapped. Seats with a red border have a same-class neighbour.", true);
});

// ---------- Report ----------
function showReport() {
  if (plan.length === 0) {
    $("reportOut").innerHTML = "<p class='empty'>Generate a plan to see the report.</p>";
    return;
  }
  var placed = 0, empty = 0, clashes = 0;
  var perClass = {};
  var roomRows = "";
  plan.forEach(function (p) {
    var used = 0;
    p.seats.forEach(function (s, i) {
      if (s) {
        placed++; used++;
        perClass[s.cls] = (perClass[s.cls] || 0) + 1;
        if (clashAt(p, i)) clashes++;
      } else { empty++; }
    });
    roomRows += "<tr><td>" + p.room + "</td><td>" + used + "</td><td>" + (p.seats.length - used) + "</td></tr>";
  });
  var classRows = "";
  Object.keys(perClass).forEach(function (c) {
    classRows += "<tr><td>" + c + "</td><td>" + perClass[c] + "</td></tr>";
  });
  var conflictText = clashes === 0 ? "No conflicts found." : clashes + " seat(s) have a same-class neighbour (marked red in the plan).";

  $("reportOut").innerHTML =
    "<div class='cards'><div class='card'><strong>" + placed + "</strong>Students seated</div>" +
    "<div class='card'><strong>" + plan.length + "</strong>Rooms used</div>" +
    "<div class='card'><strong>" + empty + "</strong>Empty seats</div>" +
    "<div class='card'><strong>" + clashes + "</strong>Conflicts</div></div>" +
    "<p class='msg " + (clashes === 0 ? "ok" : "bad") + "'>" + conflictText + "</p>" +
    "<div class='scroll'><table><thead><tr><th>Room</th><th>Seated</th><th>Empty</th></tr></thead><tbody>" + roomRows + "</tbody></table></div><br>" +
    "<div class='scroll'><table><thead><tr><th>Class / Subject</th><th>Students</th></tr></thead><tbody>" + classRows + "</tbody></table></div>";
}

// ---------- Start ----------
function showAll() {
  $("examName").value = exam.name || "";
  $("examDate").value = exam.date || "";
  showRooms(); showStudents(); showPlan(); showReport();
}
load();
showAll();

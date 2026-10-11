const GREEN = '#22b14c', DEEP = '#14532d', INK = '#0b2a12';
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// name, description, and pie/bar color for each spending category
const CATEGORY_INFO = [
  { name: 'Food',      desc: 'groceries & dining out',          color: '#0b3d1e' },
  { name: 'Rent',      desc: 'rent or mortgage payment',        color: '#22b14c' },
  { name: 'Transport', desc: 'gas, transit, rideshare',         color: '#8fd96b' },
  { name: 'Fun',       desc: 'shopping, subscriptions, outings', color: '#c6e85a' },
  { name: 'Bills',     desc: 'utilities, phone, insurance',     color: '#3b8f7a' }
];


//category and spending 
class Category {
  constructor(name, desc, color) {
    this.name = name;
    this.desc = desc;
    this.color = color;
    this.amount = 0;
  }
}

// One month's "bank statement"
class Statement {
  constructor(monthName) {
    this.monthName = monthName;
    this.categories = [];
    for (let info of CATEGORY_INFO) {
      this.categories.push(new Category(info.name, info.desc, info.color));
    }
  }

  getTotal() {
    let total = 0;
    for (let c of this.categories) total += c.amount;
    return total;
  }

  setAmounts(amounts) {
    for (let i = 0; i < this.categories.length; i++) this.categories[i].amount = amounts[i];
  }

  getAmounts() {
    let amounts = [];
    for (let c of this.categories) amounts.push(c.amount);
    return amounts;
  }
}

// Holds months and remembers selection
class Wallet {
  constructor() {
    this.statements = [];
    for (let name of MONTHS) this.statements.push(new Statement(name));
    this.selected = 9;               // 0 = Jan ... 9 = Oct
    this.load();
  }

  current() { return this.statements[this.selected]; }

  nextMonth() { this.selected = (this.selected + 1) % 12; }
  prevMonth() { this.selected = (this.selected + 11) % 12; }

  // turn the data into JSON text and store it in the browser
  save() {
    let saved = {};
    for (let s of this.statements) saved[s.monthName] = s.getAmounts();
    try { localStorage.setItem('omniwallet', JSON.stringify(saved)); } catch (e) {}
  }

  // read the JSON text back into the Statement objects
  load() {
    try {
      let text = localStorage.getItem('omniwallet');
      if (!text) return;
      let saved = JSON.parse(text);
      for (let s of this.statements) {
        if (saved[s.monthName]) s.setAmounts(saved[s.monthName]);
      }
    } catch (e) {}
  }
}

// white button
class Button {
  constructor(x, y, w, h, label) {
    this.x = x; this.y = y; this.w = w; this.h = h; this.label = label;
  }

  display() {
    noStroke(); fill(255);
    rect(this.x, this.y, this.w, this.h, this.h / 2);
    fill(INK); textAlign(CENTER, CENTER); textStyle(BOLD); textSize(20);
    text(this.label, this.x + this.w / 2, this.y + this.h / 2);
  }

  isClicked() {
    return mouseX > this.x && mouseX < this.x + this.w &&
           mouseY > this.y && mouseY < this.y + this.h;
  }
}

// one statement's categories as a pie chart with a legend
class PieChart {
  constructor(x, y, diameter) {
    this.x = x; this.y = y; this.diameter = diameter;
  }

  display(statement) {
    let total = statement.getTotal();
    if (total == 0) {
      fill(INK); textAlign(LEFT, CENTER); textSize(13); textStyle(NORMAL);
      text('No data for this month', 40, this.y);
      return;
    }
    let angle = -HALF_PI;                       // start at 12 o'clock
    for (let c of statement.categories) {
      let slice = c.amount / total * TWO_PI;    // this slice's share of the circle
      fill(c.color); stroke(255); strokeWeight(2);
      arc(this.x, this.y, this.diameter, this.diameter, angle, angle + slice, PIE);
      angle += slice;
    }
    // legend on the right
    noStroke(); textAlign(LEFT, CENTER); textSize(12); textStyle(NORMAL);
    for (let i = 0; i < statement.categories.length; i++) {
      let c = statement.categories[i];
      let ly = this.y - 56 + i * 28;
      fill(c.color); rect(172, ly - 7, 14, 14, 3);
      fill(INK);
      text(c.name + ' $' + round(c.amount) + ' · ' + round(c.amount / total * 100) + '%', 194, ly);
    }
  }
}

// bar graph
class BarGraph {
  constructor(x, y, w, h) {
    this.x = x; this.y = y; this.w = w; this.h = h;
  }

  display(wallet) {
    let biggest = 1;
    for (let s of wallet.statements) biggest = max(biggest, s.getTotal());

    let barWidth = this.w / 12;
    for (let i = 0; i < 12; i++) {
      let s = wallet.statements[i];
      let barHeight = s.getTotal() / biggest * this.h;
      noStroke();
      fill(i == wallet.selected ? DEEP : GREEN);          // selected month is darker
      rect(this.x + i * barWidth + 2, this.y + this.h - barHeight, barWidth - 4, barHeight);
      fill(INK); textAlign(CENTER, CENTER); textSize(8); textStyle(NORMAL);
      text(s.monthName, this.x + i * barWidth + barWidth / 2, this.y + this.h + 10);
    }
  }
}

let wallet, pie, bars;
let prevButton, nextButton, visualizeButton, editButton;
let inputs = [];
let screen = 0;          // 0 = input screen, 1 = results screen
let offsetX = 0;         // centers the 360px-wide app on wider screens

function rowY(i) { return 108 + i * 76; }

function setup() {
  offsetX = max(0, (windowWidth - 360) / 2);
  let cnv = createCanvas(360, 640);       // 360 x 640 is exactly 9:16
  cnv.position(offsetX, 0);

  wallet = new Wallet();
  pie = new PieChart(100, 190, 110);
  bars = new BarGraph(44, 380, 272, 110);
  prevButton = new Button(24, 56, 44, 36, '<');
  nextButton = new Button(292, 56, 44, 36, '>');
  visualizeButton = new Button(36, 526, 288, 64, 'VISUALIZE!');
  editButton = new Button(36, 550, 288, 56, 'EDIT');

  // make the 5 number boxes
  for (let i = 0; i < CATEGORY_INFO.length; i++) {
    let box = createInput('', 'number');
    box.position(offsetX + 172, rowY(i) + 4);
    inputs.push(box);
  }
  showInputsFromWallet();
}

// copy the selected month's numbers into the boxes
function showInputsFromWallet() {
  let s = wallet.current();
  for (let i = 0; i < inputs.length; i++) {
    let amount = s.categories[i].amount;
    inputs[i].value(amount == 0 ? '' : amount);
  }
}

// copy what's typed in the boxes into the selected month
function saveInputsToWallet() {
  let s = wallet.current();
  for (let i = 0; i < inputs.length; i++) {
    s.categories[i].amount = parseFloat(inputs[i].value()) || 0;
  }
  wallet.save();
}

//draw
function draw() {
  background(255);

  // green phone shape
  stroke(0); strokeWeight(5); fill(GREEN);
  rect(6, 6, 348, 628, 56);

  // title and month picker
  noStroke(); fill(255); textAlign(CENTER, CENTER); textStyle(BOLD);
  textSize(24); text('OMNIWALLET', 180, 36);
  prevButton.display();
  nextButton.display();
  fill(255); textSize(17); text(wallet.current().monthName + ' 2026', 180, 74);

  if (screen == 0) drawInputScreen();
  else drawResultScreen();
}

function drawInputScreen() {
  for (let i = 0; i < CATEGORY_INFO.length; i++) {
    fill(INK); textAlign(LEFT, TOP);
    textStyle(BOLD); textSize(19); text(CATEGORY_INFO[i].name + ':', 30, rowY(i) + 2);
    textStyle(NORMAL); textSize(10.5); text(CATEGORY_INFO[i].desc, 30, rowY(i) + 26, 130, 28);
  }
  visualizeButton.display();
}

function drawResultScreen() {
  // white card for the pie chart
  noStroke(); fill(255); rect(24, 98, 312, 190, 18);
  fill(DEEP); textAlign(LEFT, CENTER); textStyle(BOLD); textSize(13);
  text('Where it went · ' + wallet.current().monthName, 40, 116);
  pie.display(wallet.current());

  // white card for the bar graph
  noStroke(); fill(255); rect(24, 300, 312, 230, 18);
  fill(DEEP); textAlign(LEFT, CENTER); textStyle(BOLD); textSize(13);
  text('Total spending by month', 40, 320);
  bars.display(wallet);

  editButton.display();
}

function showScreen(n) {
  screen = n;
  for (let box of inputs) {
    if (n == 0) box.show(); else box.hide();
  }
}

function mousePressed() {
  if (prevButton.isClicked()) { wallet.prevMonth(); showInputsFromWallet(); }
  else if (nextButton.isClicked()) { wallet.nextMonth(); showInputsFromWallet(); }
  else if (screen == 0 && visualizeButton.isClicked()) { saveInputsToWallet(); showScreen(1); }
  else if (screen == 1 && editButton.isClicked()) { showScreen(0); }
}

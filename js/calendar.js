document.getElementsByTagName("h1")[0].style.fontSize = "6vw";

const daysContainer = document.getElementById("days-container");
const monthYearText = document.getElementById("month-year");

const today = new Date();
const currentYear = today.getFullYear();
const currentMonth = today.getMonth(); // 0-indexed (Jan = 0)
const currentDate = today.getDate();

// Array for month names
const months = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December"
];
monthYearText.innerText = `${months[currentMonth]} ${currentYear}`;

// Get first day of the month index (e.g., 0 for Sunday, 1 for Monday)
const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();

// Get total days in the current month
const totalDays = new Date(currentYear, currentMonth + 1, 0).getDate();

// 1. Render blank spaces for previous month alignment
for (let i = 0; i < firstDayIndex; i++) {
  const emptyDiv = document.createElement("div");
  daysContainer.appendChild(emptyDiv);
}

// 2. Render dates and apply the CSS highlight class to the current day
for (let day = 1; day <= totalDays; day++) {
  const dayDiv = document.createElement("div");
  dayDiv.innerText = day;

  // Check if it matches today's real date
  if (day === currentDate) {
    dayDiv.classList.add("current-day");
  }

  daysContainer.appendChild(dayDiv);
}

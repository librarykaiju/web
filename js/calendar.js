function initCalendar() {
  const firstHeading = document.querySelector("h1");
  if (firstHeading) {
    firstHeading.style.fontSize = "6vw";
  }

  const daysContainer = document.getElementById("days-container");
  const monthYearText = document.getElementById("month-year");

  if (!daysContainer || !monthYearText) {
    return;
  }

  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth(); // 0-indexed (Jan = 0)
  const currentDate = today.getDate();

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

  const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
  const totalDays = new Date(currentYear, currentMonth + 1, 0).getDate();

  for (let i = 0; i < firstDayIndex; i++) {
    const emptyDiv = document.createElement("div");
    daysContainer.appendChild(emptyDiv);
  }

  for (let day = 1; day <= totalDays; day++) {
    const dayDiv = document.createElement("div");
    dayDiv.innerText = day;

    if (day === currentDate) {
      dayDiv.classList.add("current-day");
    }

    daysContainer.appendChild(dayDiv);
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initCalendar);
} else {
  initCalendar();
}

function initCalendar() {
  const firstHeading = document.querySelector("h1");
  if (firstHeading) {
    firstHeading.style.fontSize = "6vw";
  }

  const daysContainer = document.getElementById("days-container");
  const monthYearText = document.getElementById("month-year");
  const prevMonthButton = document.getElementById("calendar-prev-month");
  const nextMonthButton = document.getElementById("calendar-next-month");

  if (!daysContainer || !monthYearText || !prevMonthButton || !nextMonthButton) {
    return;
  }

  const dateDataItems = document.querySelectorAll("#calendar-date-data li");
  const dateMap = new Map();
  dateDataItems.forEach((item) => {
    const dateKey = item.getAttribute("data-date");
    const url = item.getAttribute("data-url");
    const count = Number.parseInt(item.getAttribute("data-count") || "0", 10);

    if (dateKey && url) {
      dateMap.set(dateKey, {
        url,
        count: Number.isNaN(count) ? 0 : count,
      });
    }
  });

  const today = new Date();
  const todayYear = today.getFullYear();
  const todayMonth = today.getMonth(); // 0-indexed (Jan = 0)
  const currentDate = today.getDate();
  const viewDate = new Date(todayYear, todayMonth, 1);

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

  const toDateKey = (year, month, day) => {
    return [
      year,
      String(month + 1).padStart(2, "0"),
      String(day).padStart(2, "0"),
    ].join("-");
  };

  function renderCalendar() {
    const renderYear = viewDate.getFullYear();
    const renderMonth = viewDate.getMonth();

    monthYearText.innerText = `${months[renderMonth]} ${renderYear}`;
    daysContainer.innerHTML = "";

    const firstDayIndex = new Date(renderYear, renderMonth, 1).getDay();
    const totalDays = new Date(renderYear, renderMonth + 1, 0).getDate();

    for (let i = 0; i < firstDayIndex; i++) {
      const emptyDiv = document.createElement("div");
      emptyDiv.classList.add("calendar-day", "calendar-day--empty");
      emptyDiv.setAttribute("aria-hidden", "true");
      daysContainer.appendChild(emptyDiv);
    }

    for (let day = 1; day <= totalDays; day++) {
      const dateKey = toDateKey(renderYear, renderMonth, day);
      const dayData = dateMap.get(dateKey);
      const dayCell = dayData ? document.createElement("a") : document.createElement("div");
      dayCell.classList.add("calendar-day");

      if (dayData) {
        dayCell.href = dayData.url;
        dayCell.classList.add("calendar-day--has-posts");

        const noun = dayData.count === 1 ? "entry" : "entries";
        dayCell.setAttribute("title", `${dayData.count} ${noun} on ${dateKey}`);
        dayCell.setAttribute("aria-label", `${dayData.count} ${noun} on ${dateKey}`);
      }

      const number = document.createElement("span");
      number.classList.add("calendar-day-number");
      number.innerText = day;
      dayCell.appendChild(number);

      if (dayData && dayData.count > 0) {
        const dots = document.createElement("span");
        dots.classList.add("calendar-day-dots");

        const visibleDots = Math.min(dayData.count, 3);
        for (let i = 0; i < visibleDots; i++) {
          const dot = document.createElement("span");
          dot.classList.add("calendar-day-dot");
          dots.appendChild(dot);
        }

        dayCell.appendChild(dots);
      }

      if (renderYear === todayYear && renderMonth === todayMonth && day === currentDate) {
        dayCell.classList.add("current-day");
      }

      daysContainer.appendChild(dayCell);
    }
  }

  prevMonthButton.addEventListener("click", () => {
    viewDate.setMonth(viewDate.getMonth() - 1);
    renderCalendar();
  });

  nextMonthButton.addEventListener("click", () => {
    viewDate.setMonth(viewDate.getMonth() + 1);
    renderCalendar();
  });

  renderCalendar();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initCalendar);
} else {
  initCalendar();
}

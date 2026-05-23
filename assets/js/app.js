console.log("JS ÇALIŞTI");
let weatherData = null;
let hourlyDataGlobal = {};   // 🔥 BURAYA

function updateHourlyAll(data) {
    hourlyDataGlobal = data;
    let firstDay = Object.keys(data)[0];
    updateHourly(data[firstDay]);
}


function setActiveDay() {
    const today = new Date().toLocaleDateString("tr-TR", { weekday: "short" }).toUpperCase();

    const map = {
        "PZT": "PZT",
        "SAL": "SAL",
        "ÇAR": "ÇAR",
        "PER": "PER",
        "CUM": "CUM",
        "CMT": "CMT",
        "PAZ": "PAZ"
    };

    const todayShort = map[today];

    const cards = document.querySelectorAll(".forecast-card");

    cards.forEach(card => {
        card.classList.remove("active-day");

        const label = card.querySelector(".day-label");

        if (label && label.innerText.trim() === todayShort) {
            card.classList.add("active-day");
        }
    });

    console.log("Bugün:", todayShort);
};

let pybridge = null;

function loadSavedUserProfile() {
    const heroTitle = document.getElementById("hero-title");
    const savedUser = JSON.parse(localStorage.getItem("skycodeUser"));

    if (!savedUser) return;

    const hour = new Date().getHours();
    let greeting = "Merhaba";

    if (hour >= 5 && hour < 12) {
        greeting = "Günaydın ";
    } else if (hour >= 12 && hour < 18) {
        greeting = "İyi Günler ";
    } else if (hour >= 18 && hour < 22) {
        greeting = "İyi Akşamlar ";
    } else {
        greeting = "İyi Geceler ";
    }

    heroTitle.innerHTML = `${greeting} ${savedUser.name}`;

    document.getElementById("profile-style").innerText = savedUser.style;
    document.getElementById("profile-cold").innerText = savedUser.coldLevel;
    document.getElementById("profile-routine").innerText = savedUser.routine;
    document.getElementById("profile-activities").innerText =
        savedUser.activities.join(" • ");
}

window.addEventListener("load", () => {
    loadSavedUserProfile();

    if (typeof QWebChannel === "undefined" || typeof qt === "undefined") {
        console.warn("Qt WebChannel bulunamadı; sayfa statik önizleme modunda açıldı.");
        return;
    }

    new QWebChannel(qt.webChannelTransport, function(channel) {
        pybridge = channel.objects.pybridge;
        console.log("bridge bağlandı");
    });
});

setTimeout(() => {

    loadAnalysisChart();
    loadAnalysisCards();

}, 1000);

function getWeather() {
    let city = document.querySelector("input").value;

    if (pybridge) {
        pybridge.getWeather(city);
    } else {
        console.log("bridge yok");
    }
}

// 🔥 BUNU EKLE
function updateWeather(
    temp,
    feels,
    humidity,
    wind,
    name,
    desc,
    rain = 0,
    day = "Bugün"
) {

    weatherData = {
        temp,
        feels,
        humidity,
        wind,
        city: name,
        desc,
        rain
    };

    document.getElementById("temp-value").innerText = temp;
    document.getElementById("feels-value").innerText =
    feels + "°";
    document.getElementById("humidity-value").innerText = humidity + "%";
    document.getElementById("wind-value").innerText = wind + " km/h";
    document.getElementById("city-name").innerText = name;

    // TARİH + GÜN

    const months = [
        "Ocak","Şubat","Mart","Nisan","Mayıs","Haziran",
        "Temmuz","Ağustos","Eylül","Ekim","Kasım","Aralık"
    ];

    const today = new Date();

    const formattedDate =
    `${day}, ${today.getDate()} ${months[today.getMonth()]}`;

    document.getElementById("selected-day").innerText =
    formattedDate;

    // 🔥 YAĞIŞ EKLE
    if (document.getElementById("rain-value")) {
        document.getElementById("rain-value").innerText = rain + "%";
    }

    // 🔥 hava durumu çeviri
    let weatherMap = {
        "Clear": "Güneşli",
        "Clouds": "Bulutlu",
        "Rain": "Yağmurlu",
        "Snow": "Karlı",
        "Drizzle": "Çiseli",
        "Thunderstorm": "Fırtınalı"
    };

    let text = weatherMap[desc] || desc;

    document.getElementById("weather-desc").innerText = text;

    loadAnalysisChart();
    loadAnalysisCards();

    const recContainer =
document.getElementById("recommendation-list");

console.log(recContainer);

recContainer.innerHTML = "";

}


function updateForecast(data) {
    const container = document.getElementById("forecast-container");
    container.innerHTML = "";

    let iconMap = {
        "Clear": "wb_sunny",
        "Clouds": "cloud",
        "Rain": "rainy",
        "Snow": "ac_unit",
        "Drizzle": "grain",
        "Thunderstorm": "thunderstorm"
    };

    data.forEach((item, index) => {

    const encoded =
    encodeURIComponent(JSON.stringify(item));

    let card = `
<div class="forecast-card min-w-[110px] p-5 rounded-3xl text-center 
bg-white border border-gray-200
lift-hover transition-all duration-300 cursor-pointer"

data-day="${encoded}"
onclick="selectDay(this, event)">

    <div class="day-label text-xs opacity-50 mb-2 font-bold tracking-widest">
        ${item.day}
    </div>

    <span class="material-symbols-outlined text-blue-400 text-3xl mb-2">
        ${iconMap[item.weather] || "wb_sunny"}
    </span>

    <div class="font-bold">${item.min}° / ${item.max}°</div>
</div>
`;

    container.innerHTML += card;
});

    setTimeout(() => {
        setActiveDay();
    }, 100);
}

function updateHourly(data) {

    const container = document.getElementById("hourly-container");
    container.innerHTML = "";

    data.forEach((item, index) => {

        let time = item[0];
        let temp = item[1];
        let rain = item[2];
        let humidity = item[3];
        let wind = item[4];
        let feels = item[5];
        let weather = item[6];

        let hour = parseInt(time.split(":")[0]);

        // 🌙 gece/gündüz
        let isDay = hour >= 6 && hour < 18;

        let icon = isDay ? "light_mode" : "dark_mode";
        let color = isDay ? "text-yellow-500" : "text-blue-500";

        let card = `
    <div 
    class="min-w-[100px] p-4 rounded-3xl text-center 
    bg-white border border-gray-100
    hover:scale-105 hover:-translate-y-1
    transition-all duration-300 cursor-pointer"

    data-hour='${encodeURIComponent(JSON.stringify(item))}'
    onclick="selectHour(this, event)">

    <div class="text-xs opacity-50 font-medium mb-1">
        ${time}
    </div>

    <span class="material-symbols-outlined ${color} text-2xl mb-1">
        ${icon}
    </span>

    <div class="text-lg font-extrabold text-slate-800">
        ${temp}°
    </div>

    <div class="text-xs text-blue-500 font-bold mt-1">
        ${rain}%
    </div>

</div>
`;

        container.innerHTML += card;
    });
}

function selectDay(element, event) {

    let dayData =
    JSON.parse(decodeURIComponent(element.dataset.day));

    console.log(dayData);

    let fullDays = {

        "PZT": "Pazartesi",
        "SAL": "Salı",
        "ÇAR": "Çarşamba",
        "PER": "Perşembe",
        "CUM": "Cuma",
        "CMT": "Cumartesi",
        "PAZ": "Pazar"
    };

    // TARİH
    document.getElementById("selected-day").innerText =
        `${fullDays[dayData.day] || dayData.day}, ${dayData.date}`;

    document.getElementById("wear-date").innerText =
    `${fullDays[dayData.day] || dayData.day}, ${dayData.date}`;

    // aktif kart
    document.querySelectorAll(".forecast-card")
        .forEach(c => c.classList.remove("active-day"));

    element.classList.add("active-day");

    // sıcaklık
    document.getElementById("temp-value").innerText =
        dayData.temp + "°";

    // hava durumu
    let weatherMap = {
        "Clear": "Güneşli",
        "Clouds": "Bulutlu",
        "Rain": "Yağmurlu",
        "Snow": "Karlı",
        "Drizzle": "Çiseli",
        "Thunderstorm": "Fırtınalı"
    };

    document.getElementById("weather-desc").innerText =
        weatherMap[dayData.weather] || dayData.weather;

    // detaylar
    document.getElementById("humidity-value").innerText =
        dayData.humidity + "%";

    document.getElementById("wind-value").innerText =
        dayData.wind + " km/h";

    document.getElementById("feels-value").innerText =
        dayData.feels + "°";

    document.getElementById("rain-value").innerText =
        dayData.rain + "%";

    // saatlik güncelle
    let selectedDayKey =
        Object.keys(hourlyDataGlobal)[dayData.index];

    if (hourlyDataGlobal[selectedDayKey]) {
        updateHourly(hourlyDataGlobal[selectedDayKey]);
    }

    // analiz chart
    updateAnalysisChart(dayData.index);

    // outfit
    updateWearPage({
        city: document.getElementById("city-name").innerText,
        temp: dayData.temp,
        desc: weatherMap[dayData.weather] || dayData.weather,
        humidity: dayData.humidity,
        wind: dayData.wind,
        rain: dayData.rain,
        morning: dayData.temp + 2,
        noon: dayData.temp + 4,
        evening: dayData.temp - 1
    });

    // analiz kartları
    updateAnalysisPage({
        temp: dayData.temp,
        humidity: dayData.humidity,
        wind: dayData.wind,
        rain: dayData.rain
    });
}

function findDateKey(dayName) {

    let map = {
        "PZT": "Mon",
        "SAL": "Tue",
        "ÇAR": "Wed",
        "PER": "Thu",
        "CUM": "Fri",
        "CMT": "Sat",
        "PAZ": "Sun"
    };

    let today = new Date();

    for (let i = 0; i < 5; i++) {
        let d = new Date();
        d.setDate(today.getDate() + i);

        let en = d.toLocaleDateString("en-US", { weekday: "short" });

        if (map[dayName] === en) {
            return d.toISOString().split("T")[0];
        }
    }
}

function selectHour(element, event) {

    let hourData =
    JSON.parse(
        decodeURIComponent(
            element.dataset.hour
        )
    );

    let temp = hourData[1];
    let rain = hourData[2];
    let humidity = hourData[3];
    let wind = hourData[4];
    let feels = hourData[5];
    let weather = hourData[6];

    let weatherMap = {
        "Clear": "Güneşli",
        "Clouds": "Bulutlu",
        "Rain": "Yağmurlu",
        "Snow": "Karlı"
    };

    document.getElementById("temp-value").innerText = temp + "°";

    document.getElementById("rain-value").innerText =
        rain + "%";

    document.getElementById("humidity-value").innerText =
        humidity + "%";

    document.getElementById("wind-value").innerText =
        wind + " km/h";

    document.getElementById("feels-value").innerText =
        feels + "°";

    document.getElementById("weather-desc").innerText =
        weatherMap[weather] || weather;
}



let tempChart = null;

function showSection(sectionId, btn){

    document.querySelectorAll(".page-section")
    .forEach(section=>{
        section.classList.remove("active-section");
    });

    document.getElementById(sectionId).classList.add('active-section');

    document.getElementById(sectionId)
    .classList.add("active-section");

    document.querySelectorAll(".nav-btn")
    .forEach(button=>{
        button.classList.remove("active-nav");
    });

    btn.classList.add("active-nav");

    window.scrollTo({
        top:0,
        behavior:"smooth"
    });

    // 🔥 ANALİZ SAYFASI AÇILDIĞINDA
    if(sectionId === "analysis-section"){
        loadAnalysisChart();
    }
    
    if(sectionId === "planner-section"){
    
        if(weatherData){

        updatePlannerTimeline(weatherData);
    }


    updatePlannerWeatherCards();

    updatePlannerAI();
}
}

function loadAnalysisChart(){

    if(!pybridge) return;

    pybridge.getAnalysisData(function(rawData){

        console.log("RAW:", rawData);

        let analysisData;

        if(typeof rawData === "string"){

            analysisData = JSON.parse(rawData);

        }else{

            analysisData = rawData;
        }

        console.log("PARSED:", analysisData);

        const canvas =
        document.getElementById("tempChart");

        if(!canvas){
            console.log("canvas yok");
            return;
        }

        if(tempChart){
            tempChart.destroy();
        }

        const ctx =
        canvas.getContext("2d");

        tempChart = new Chart(ctx, {

            type: "line",

            data: {

                labels: analysisData.labels,

                datasets: [

                    {
                        label: "Sıcaklık",

                        data: analysisData.temps.map(Number),

                        borderColor: "#2563eb",

                        backgroundColor:
                        "rgba(37,99,235,0.15)",

                        fill: true,

                        tension: 0.4,

                        borderWidth: 4
                    },

                    {
                        label: "Hissedilen",

                        data: analysisData.feels.map(Number),

                        borderColor: "#60a5fa",

                        fill: false,

                        tension: 0.4,

                        borderWidth: 3
                    }
                ]
            },

            options: {

                responsive: true,

                maintainAspectRatio: false,

                plugins: {

    legend: {

        display: false
    }
},

                scales: {

                    y: {

                        min: Math.min(...analysisData.temps) - 2,

                        max: Math.max(...analysisData.temps) + 2,

                        ticks: {

                            callback: function(value){

                                return value + "°C";
                            }
                        }
                    }
                }
            }
        });

    });
}

function loadAnalysisCards(){

    if(!pybridge) return;

    pybridge.getAnalysisCards(function(rawData){

        console.log("CARD RAW:", rawData);

        let data;

        if(typeof rawData === "string"){

            data = JSON.parse(rawData);

        }else{

            data = rawData;
        }

        console.log("CARD DATA:", data);

        // NEM
        document.getElementById("humidityValue").innerHTML =
            `${data.humidity}<span class="text-2xl font-bold ml-1">%</span>`;

        // RÜZGAR
        document.getElementById("windValue").innerHTML =
            `${data.wind}<span class="text-2xl font-bold ml-1">km/h</span>`;

        // UV
        document.getElementById("uvValue").innerText =
            `UV İNDEKSİ (${data.uv})`;

        // AQI
        document.getElementById("aqiValue").innerHTML =
            `${data.aqi} <span class="text-sm font-bold text-outline/50">AQI</span>`;

        // YAĞIŞ
        document.getElementById("rainValue").innerHTML =
            `${data.rain} <span class="text-sm font-bold text-outline/50">%</span>`;
    });
}

function updateWearPage(data){

    if(!data.desc){
    data.desc = "";
}

    const morningText = document.getElementById("morning-text");
    const noonText = document.getElementById("noon-text");
    const eveningText = document.getElementById("evening-text");

    if (!morningText || !noonText || !eveningText) {
        console.log("Öneri kartları bulunamadı");
        return;
    }

    document.getElementById("wear-city").innerText =
        data.city;

    document.getElementById("wear-temp").innerText =
        data.temp + "°C";

    document.getElementById("wear-desc").innerText =
        data.desc;

    document.getElementById("morning-degree").innerText =
        data.morning + "°C";

    document.getElementById("noon-degree").innerText =
        data.noon + "°C";

    document.getElementById("evening-degree").innerText =
        data.evening + "°C";



    // HAVA DURUMU ICON
    let icon = "wb_sunny";

    if(data.desc.includes("Bulut")){
        icon = "cloud";
    }
    else if(data.desc.includes("Yağ")){
        icon = "rainy";
    }
    else if(data.desc.includes("Kar")){
        icon = "ac_unit";
    }
    else if(data.desc.includes("Sis")){
        icon = "foggy";
    }
    else if(data.desc.includes("Fırtına")){
        icon = "thunderstorm";
    }

    document.getElementById("wear-icon").innerText = icon;



    // TARİH
    const months = [
        "Ocak","Şubat","Mart","Nisan","Mayıs","Haziran",
        "Temmuz","Ağustos","Eylül","Ekim","Kasım","Aralık"
    ];




    // SABAH / ÖĞLE / AKŞAM YAZILARI
    let morningAdvice = "";
    let noonAdvice = "";
    let eveningAdvice = "";

    const desc = data.desc.toLowerCase();


    // SABAH
    if (
        desc.includes("yağmur") ||
        desc.includes("sağanak")
    ) {

        if(data.morning <= 10){

            morningAdvice =
            "<strong class='text-on-surface'>Yağmurluk:</strong> Sabah serin ve yağışlı görünüyor.";

        }

        else{

            morningAdvice =
            "<strong class='text-on-surface'>Hafif yağmurluk:</strong> İnce koruyucu katman iyi olacaktır.";

        }

    }

    else if (data.morning <= 10) {

        morningAdvice =
        "<strong class='text-on-surface'>Mont:</strong> Sabah saatleri oldukça serin.";

    }

    else if (data.morning <= 18) {

        morningAdvice =
        "<strong class='text-on-surface'>Hafif ceket:</strong> İnce bir katman yeterli olacaktır.";

    }

    else {

        morningAdvice =
        "<strong class='text-on-surface'>İnce üst:</strong> Rahat ve ferah seçimler yapabilirsiniz.";

    }



    // ÖĞLE
    if (
        desc.includes('yağmur') ||
        desc.includes('sağanak')
    ){

        noonAdvice =
        "<strong class='text-on-surface'>Su geçirmez üst:</strong> Öğle saatlerinde yağış ihtimali var.";

    }

    else if (data.noon >= 28) {

        noonAdvice =
        "<strong class='text-on-surface'>T-shirt:</strong> Çok sıcak saatler, ince kumaş tercih edin.";

    }

    else if (data.noon >= 20) {

        noonAdvice =
        "<strong class='text-on-surface'>Pamuklu üst:</strong> Hava oldukça ideal görünüyor.";

    }

    else {

        noonAdvice =
        "<strong class='text-on-surface'>İnce sweatshirt:</strong> Hafif serin hava devam ediyor.";

    }



    // AKŞAM
    if (
        desc.includes('yağmur') ||
        desc.includes('sağanak')
    ){

        eveningAdvice =
        "<strong class='text-on-surface'>Hoodie:</strong> Akşam serinliği ve yağış için ideal.";

    }

    else if (data.evening <= 10) {

        eveningAdvice =
        "<strong class='text-on-surface'>Kalın üst:</strong> Akşam saatlerinde hava serinleşiyor.";

    }

    else if (data.evening <= 18) {

        eveningAdvice =
        "<strong class='text-on-surface'>Sweatshirt:</strong> Akşam için rahat bir seçim.";

    }

    else {

        eveningAdvice =
        "<strong class='text-on-surface'>Rahat kombin:</strong> Akşam havası oldukça güzel.";

    }



    // KARTLARA YAZ
    morningText.innerHTML = morningAdvice;
    noonText.innerHTML = noonAdvice;
    eveningText.innerHTML = eveningAdvice;


    // ÜST GİYİM
    let topwear = "";

    if (data.temp < 10) {

        topwear =
        "Kalın mont veya hoodie önerilir.";

    }

    else if (data.temp < 20) {

        topwear =
        "İnce sweatshirt veya hafif ceket önerilir.";

    }

    else {

        topwear =
        "T-shirt ve ince kumaşlar ideal olacaktır.";

    }

    document.getElementById("topwear-text").innerText =
        topwear;



    // AYAKKABI
    let shoes = "";

    if (data.rain > 50) {

        shoes =
        "Suya dayanıklı ayakkabı önerilir.";

    }

    else if (data.wind > 20) {

        shoes =
        "Kapalı ve rahat sneaker tercih edin.";

    }

    else {

        shoes =
        "Sneaker veya günlük rahat ayakkabı ideal.";

    }

    document.getElementById("shoe-text").innerText =
        shoes;



    // AKSESUAR
    let accessory = "";

    if (data.desc.includes("Güneş")) {

        accessory =
        "Güneş gözlüğü ve şapka önerilir.";

    }

    else if (data.desc.includes("Yağ")) {

        accessory =
        "Şemsiye taşımanız önerilir.";

    }

    else if (data.wind > 25) {

        accessory =
        "İnce atkı veya rüzgarlık kullanılabilir.";

    }

    else {

        accessory =
        "Minimal aksesuarlarla rahat kombin yapılabilir.";

    }

    document.getElementById("accessory-text").innerText =
        accessory;



    // BUGÜN YANINA AL
    let carryItems = [];

    if (data.desc.includes("Güneş")) {

        carryItems = [
            "🕶️ Güneş Gözlüğü",
            "💧 Su Şişesi",
            "🧴 Güneş Kremi",
            "🧢 Şapka"
        ];
    }

    else if (data.desc.includes("Yağ")) {

        carryItems = [
            "☂️ Şemsiye",
            "🧥 Yağmurluk",
            "👟 Su Geçirmez Ayakkabı"
        ];
    }

    else if (data.temp < 10) {

        carryItems = [
            "🧣 Atkı",
            "🧤 Eldiven",
            "🧥 Kalın Mont"
        ];
    }

    else {

        carryItems = [
            "🎧 Kulaklık",
            "💧 Su Şişesi",
            "👜 Hafif Çanta"
        ];
    }

    document.getElementById("carry-items").innerHTML =
    carryItems.map(item => `
        <div class="px-5 py-3 rounded-2xl bg-white/70 border border-white/60
        font-semibold shadow-sm hover:scale-105 transition-all duration-300">
        ${item}
        </div>
    `).join("");



    // GÜNÜN RENKLERİ
    let colors = [];
    let paletteText = "";

    if (data.desc.includes("Güneş")) {

        colors = ["#E9E2D8", "#B7D0E8", "#FFFFFF", "#2B2B2B"];

        paletteText =
        "Bugün açık tonlar, beyaz ve soft mavi kombinler hava ile mükemmel uyum sağlar.";
    }

    else if (data.desc.includes("Bulut")) {

        colors = ["#D6D3D1", "#9CA3AF", "#E5E7EB", "#374151"];

        paletteText =
        "Bulutlu havalar için gri, taş ve koyu tonlar modern görünür.";
    }

    else if (data.desc.includes("Yağ")) {

        colors = ["#1F2937", "#334155", "#64748B", "#CBD5E1"];

        paletteText =
        "Yağışlı havalarda koyu ve güçlü tonlar şık görünüm sağlar.";
    }

    else {

        colors = ["#F5F5F4", "#D4D4D8", "#A1A1AA", "#27272A"];

        paletteText =
        "Minimal ve nötr tonlar bugünün havasına uyum sağlar.";
    }

    document.getElementById("color-1").style.background =
        colors[0];

    document.getElementById("color-2").style.background =
        colors[1];

    document.getElementById("color-3").style.background =
        colors[2];

    document.getElementById("color-4").style.background =
        colors[3];

    document.getElementById("palette-text").innerText =
        paletteText;
}

function selectForecastDay(index){

    pybridge.getForecastDayData(index)
    .then((result)=>{

        const data = JSON.parse(result);
        weatherData = data;

        console.log(data);

        // ANA KART
        updateWeather(
            data.temp,
            data.feels,
            data.humidity,
            data.wind,
            data.city,
            data.desc,
            data.rain
        );

        // GİYİM SAYFASI
        updateWearPage(data);

    });

}

function updateAnalysisPage(data){

    const humidity =
document.getElementById("humidityValue");

    const wind =
document.getElementById("windValue");

    const rain =
document.getElementById("rainValue");

    const uv =
document.getElementById("uvValue");

    const aqi =
document.getElementById("aqiValue");

    if(!humidity || !wind || !rain || !uv || !aqi){

        console.log("Analiz elementleri bulunamadı");

        return;
    }

    // NEM
    humidity.innerHTML =
`${Math.round(data.humidity)}<span class="text-2xl font-bold ml-1">%</span>`;

    // RÜZGAR
    wind.innerHTML =
`${Math.round(data.wind)}<span class="text-2xl font-bold ml-1">km/h</span>`;

    // YAĞIŞ
    rain.innerHTML =
`${Math.round(data.rain)}<span class="text-sm font-bold text-outline/50">%</span>`;

    // UV
    let uvLevel = 3;

    if(data.temp >= 30){
        uvLevel = 9;
    }

    else if(data.temp >= 24){
        uvLevel = 7;
    }

    else if(data.temp >= 18){
        uvLevel = 5;
    }

    uv.innerHTML =
`${uvLevel} <span class="text-sm font-bold text-outline/50">/ 11</span>`;

    // AQI
    let aqiLevel = 25;

    if(data.rain > 50){
        aqiLevel = 38;
    }

    if(data.wind > 20){
        aqiLevel = 45;
    }

    aqi.innerHTML =
`${aqiLevel} <span class="text-sm font-bold text-outline/50">AQI</span>`;
}

function updateAnalysisChart(dayIndex){

    let selectedDayKey =
        Object.keys(hourlyDataGlobal)[dayIndex];

    if(!selectedDayKey) return;

    let hourlyData =
        hourlyDataGlobal[selectedDayKey];

    let labels = [];
    let temps = [];
    let feels = [];

    hourlyData.forEach(item=>{

        labels.push(item[0]);

        temps.push(item[1]);

        feels.push(item[5]);
    });

    const canvas =
        document.getElementById("tempChart");

    if(!canvas) return;

    if(tempChart){
        tempChart.destroy();
    }

    const ctx = canvas.getContext("2d");

    tempChart = new Chart(ctx, {

        type: "line",

        data: {

            labels: labels,

            datasets: [

                {
                    label: "Sıcaklık",

                    data: temps,

                    borderColor: "#2563eb",

                    backgroundColor:
                    "rgba(37,99,235,0.15)",

                    fill: true,

                    tension: 0.4,

                    borderWidth: 4
                },

                {
                    label: "Hissedilen",

                    data: feels,

                    borderColor: "#60a5fa",

                    fill: false,

                    tension: 0.4,

                    borderWidth: 3
                }
            ]
        },

        options: {

            responsive: true,

            maintainAspectRatio: false,

            plugins: {
                legend: {
                    display: false
                }
            },

            scales: {

                y: {

                    min: Math.min(...temps) - 2,

                    max: Math.max(...temps) + 2,

                    ticks: {

                        callback: function(value){

                            return value + "°C";
                        }
                    }
                }
            }
        }
    });
}

let selectedStyle = "";
let selectedRoutine = "";
let selectedActivities = [];


// STYLE SEÇİMİ
document.querySelectorAll(".style-btn")
.forEach(btn=>{

    btn.addEventListener("click", function(){

        document.querySelectorAll(".style-btn")
        .forEach(b=>{

            b.classList.remove(
                "bg-blue-600",
                "text-white"
            );

            b.classList.add(
                "bg-slate-100",
                "text-slate-600"
            );
        });

        this.classList.remove(
            "bg-slate-100",
            "text-slate-600"
        );

        this.classList.add(
            "bg-blue-600",
            "text-white"
        );

        selectedStyle =
        this.dataset.style;
    });

});


// ROUTINE SEÇİMİ
document.querySelectorAll(".routine-btn")
.forEach(btn=>{

    btn.addEventListener("click", function(){

        document.querySelectorAll(".routine-btn")
        .forEach(b=>{

            b.classList.remove(
                "bg-blue-600",
                "text-white"
            );

            b.classList.add(
                "bg-slate-100"
            );
        });

        this.classList.add(
            "bg-blue-600",
            "text-white"
        );

        selectedRoutine =
        this.dataset.routine;
    });

});


// AKTİVİTE
document.querySelectorAll(".activity-btn")
.forEach(btn=>{

    btn.addEventListener("click", function(){

        const activity =
        this.dataset.activity;

        this.classList.toggle("bg-blue-600");
        this.classList.toggle("text-white");
        this.classList.toggle("scale-105");
        this.classList.toggle("shadow-lg");

        if(selectedActivities.includes(activity)){

            selectedActivities =
            selectedActivities.filter(
                a => a !== activity
            );

        }else{

            selectedActivities.push(activity);
        }

        console.log(selectedActivities);
    });

});

// KAYIT OLUŞTUR
document.getElementById("create-account-btn")
.addEventListener("click", function(){

    const name =
    document.getElementById("signup-name").value;

    const email =
    document.getElementById("signup-email").value;

    if(name.trim() === "" || email.trim() === ""){

        alert("Lütfen tüm alanları doldurun");
        return;
    }

    // SOĞUK HASSASİYETİ

    const slider =
    document.querySelector(".custom-slider");

    let coldText = "Normal";

    if(slider){

        const coldValue =
        parseInt(slider.value);

        if(coldValue <= 3){

            coldText = "Çok Üşür";
        }

        else if(coldValue <= 7){

            coldText = "Normal";
        }

        else{

            coldText = "Kolay Terler";
        }
    }

    console.log("SOĞUK:", coldText);

const userData = {

    name: name,

    email: email,

    style: selectedStyle,

    coldLevel: coldText,

    routine: selectedRoutine,

    activities: selectedActivities
}

    localStorage.setItem(
        "skycodeUser",
        JSON.stringify(userData)
    );

updateAIProfile(userData);

    // PROFİLİ GÜNCELLE
document.getElementById("profile-style").innerText =
    userData.style;

document.getElementById("profile-cold").innerText =
    userData.coldLevel;

document.getElementById("profile-routine").innerText =
    userData.routine;

document.getElementById("profile-activities").innerText =
    userData.activities.join(" • ");

    // PROFİL SAYFASINI GÜNCELLE
    updateProfilePage(userData);

    // kullanıcı sayfasına geç
    showSection(
        "profile-section",
        document.querySelector(".user-nav-btn")
    );
});


// KULLANICI ICONUNA TIKLAYINCA
function openUserPage(btn){

    const savedUser =
    localStorage.getItem("skycodeUser");

    // kullanıcı varsa
    if(savedUser){

        const userData =
        JSON.parse(savedUser);

        updateProfilePage(userData);
        updateAIProfile(userData);

        loadFavoriteCities();

        showSection("profile-section", btn);

    }

    // kayıt yoksa onboarding
    else{

        showSection("signup-section", btn);
    }
}


// PROFİLİ GÜNCELLE
function updateProfilePage(user){

    // isim
    const nameEl =
    document.getElementById("profile-name");

    if(nameEl){
        nameEl.innerText = user.name;
    }

    // email
    const emailEl =
    document.getElementById("profile-email");

    if(emailEl){
        emailEl.innerText = user.email;
    }
}

function logoutUser(){

    // kullanıcıyı sil
    localStorage.removeItem("skycodeUser");

    // onboarding ekranına dön
    showSection(
        "signup-section",
        document.querySelector(".user-nav-btn")
    );

    // inputları temizle
    document.getElementById("signup-name").value = "";
    document.getElementById("signup-email").value = "";

    // seçimleri sıfırla
    selectedActivities = [];
    selectedStyle = "";
    selectedRoutine = "";

    // aktif classları temizle
    document.querySelectorAll(".activity-btn")
    .forEach(btn=>{

        btn.classList.remove(
            "bg-blue-600",
            "text-white",
            "scale-105",
            "shadow-lg"
        );

        btn.classList.add("bg-slate-100");
    });

    document.querySelectorAll(".style-btn")
    .forEach(btn=>{

        btn.classList.remove(
            "bg-blue-600",
            "text-white"
        );

        btn.classList.add(
            "bg-slate-100",
            "text-slate-600"
        );
    });

    document.querySelectorAll(".routine-btn")
    .forEach(btn=>{

        btn.classList.remove(
            "bg-blue-600",
            "text-white"
        );

        btn.classList.add("bg-slate-100");
    });

    // slider reset
    document.querySelector(".custom-slider").value = 5;
}

function updateAIProfile(user){

    if(!user) return;

    // 1. SOĞUK ANALİZİ

    let line1 = "";

    if(user.coldLevel === "Çok Üşür"){

        line1 =
        "🧥 Serin havalarda katmanlı ve sıcak kombinler öneriliyor.";
    }

    else if(user.coldLevel === "Normal"){

        line1 =
        "🌤️ Hava değişimlerine dengeli şekilde uyum sağlıyorsun.";
    }

    else{

        line1 =
        "☀️ Hafif ve ferah kombinler senin için daha konforlu.";
    }

    // 2. AKTİVİTE ANALİZİ

    let line2 = "";

    if(user.activities && user.activities.includes("Fitness")){

        line2 =
        "💪 Gün içinde aktif yaşam tarzına uygun öneriler hazırlanıyor.";
    }

    else if(user.activities && user.activities.includes("Kahve")){

        line2 =
        "☕ Kafe ve sosyal alanlar için rahat kombinler öne çıkarılıyor.";
    }

    else if(user.activities && user.activities.includes("Seyahat")){

        line2 =
        "✈️ Seyahat odaklı hava önerileri senin için optimize ediliyor.";
    }

    else{

        line2 =
        "🌎 Günlük yaşam rutinine uygun hava önerileri hazırlanıyor.";
    }

    // 3. GİYİM TARZI

    let tips = [];

if(user.style === "Minimal"){

    tips.push("🤍 Minimal ve rahat kombinler bugün daha uyumlu.");
}

if(user.activities?.includes("Kahve")){

    tips.push("☕ Açık hava kahve molası için güzel bir gün.");
}

if(user.activities?.includes("Koşu")){

    tips.push("🏃 Sabah saatleri koşu için daha verimli görünüyor.");
}

if(weatherData && weatherData.temp < 15){

    tips.push("🧥 İnce bir ceket alman iyi olabilir.");
}

    // HTML’E BAS

    document.getElementById("ai-line-1").innerText =
    line1;

    document.getElementById("ai-line-2").innerText =
    line2;

}
function updatePlannerAI(){

    const savedUser =
    JSON.parse(localStorage.getItem("skycodeUser"));

    if(!savedUser || !weatherData) return;

    const temp = weatherData.temp;
    const rain = weatherData.rain;
    const tipsContainer =
    document.getElementById("planner-ai-tips");


    let score = 90;

    if(temp > 32) score -= 10;

    if(rain > 50) score -= 15;

    // AI YAZISI
    let message = "";

    if(temp >= 20 && rain < 30){

        message =
        `${savedUser.name}, bugün dışarı çıkmak ve aktif olmak için harika bir gün.`;

    }

    else if(rain > 50){

        message =
        `${savedUser.name}, bugün daha sakin ve kapalı alan aktiviteleri sana daha uygun görünüyor. `;

    }

    else{

        message =
        `${savedUser.name}, bugün dengeli ve rahat bir gün seni bekliyor. `;
    }

    document.getElementById("planner-ai-message")
    .innerText = message;

    // SCORE
    document.getElementById("planner-score")
    .innerText = `${score}/100`;

    document.getElementById("planner-score-bar")
    .style.width = `${score}%`;

    // TAGLER
    const tags =
    document.getElementById("planner-tags");

    tags.innerHTML = "";

    const tagList = [];

    if(temp >= 22){
        tagList.push("Enerjik");
    }

    if(rain < 30){
        tagList.push("Temiz Hava");
    }

    if(weatherData.wind < 20){
        tagList.push("Hafif Rüzgar");
    }

    if(savedUser.style === "Minimal"){
        tagList.push("Minimal Stil");
    }

    tagList.forEach(tag=>{

        tags.innerHTML += `
        <div class="px-4 py-2 rounded-full
        bg-white/10 text-sm backdrop-blur-xl">
            ${tag}
        </div>
        `;
    });


let tips = [];

if(savedUser.style === "Minimal"){

    tips.push("🤍 Minimal ve rahat kombinler bugün daha uyumlu.");
}

if(savedUser.activities.includes("Kahve")){

    tips.push("☕ Açık hava kahve molası için güzel bir gün.");
}

if(savedUser.activities.includes("Koşu")){

    tips.push("🏃 Sabah saatleri koşu için daha verimli görünüyor.");
}

if(weatherData.temp < 15){

    tips.push("🧥 İnce bir ceket alman iyi olabilir.");
}

tipsContainer.innerHTML = "";

tips.forEach(tip=>{

    tipsContainer.innerHTML += `
    
    <div class="
    bg-white/15
    border border-white/10
    rounded-2xl
    px-4 py-4
    text-white
    text-sm
    backdrop-blur-xl
    shadow-lg
    ">
        ${tip}
    </div>
    `;
});
}

function updatePlannerTimeline(data){
    const timeline =
    document.getElementById("planner-timeline");

    if(!timeline || !weatherData) return;

    timeline.innerHTML = "";

    const plannerItems = [

        {
            time:"08:00",
            title:"Güne Hazırlık",
            desc:"Serin ve sakin başlangıç.",
            temp: weatherData.temp - 2,
            weather:"Güneşli",
            icon:"wb_sunny",
            badge:"Sakin"
        },

        {
            time:"10:00",
            title:"Dışarı Çıkmak İçin İdeal",
            desc:"Temiz hava ve düşük nem.",
            temp: weatherData.temp,
            weather:"Güneşli",
            icon:"light_mode",
            badge:"En İyi Saat"
        },

        {
            time:"15:00",
            title:"Kısa Mola Zamanı",
            desc:"Rahat tempo için güzel saatler.",
            temp: weatherData.temp + 2,
            weather:"Güneşli",
            icon:"partly_cloudy_day",
            badge:"Relax"
        },

        {
            time:"20:00",
            title:"Akşam Dinlenmesi",
            desc:"Daha sakin aktiviteler önerilir.",
            temp: weatherData.temp - 4,
            weather:"Gece",
            icon:"dark_mode",
            badge:"Akşam"
        }

    ];

    plannerItems.forEach((item)=>{

        timeline.innerHTML += `

        <div class="relative grid grid-cols-[70px_30px_1fr] gap-6 mb-14 items-start">

            <!-- saat -->
            <div class="w-16 text-right pt-2">

                <span class="text-blue-600 font-bold text-lg">
                    ${item.time}
                </span>

            </div>

            <!-- çizgi -->
            <div class="relative flex flex-col items-center">

                <div class="
                w-5 h-5
                rounded-full
                bg-blue-500
                border-4 border-white
                shadow-lg shadow-blue-200
                z-10
                "></div>

                <div class="
                w-1
                flex-1
                bg-gradient-to-b
                from-blue-400
                to-blue-100
                min-h-[90px]
                "></div>

            </div>

            <!-- kart -->
            <div class="
            flex-1
            rounded-3xl
            p-5
            bg-white/70
            backdrop-blur-xl
            border border-white/40
            shadow-xl
            hover:shadow-2xl
            transition-all
            duration-300
            hover:-translate-y-1
            ">

                <div class="flex items-start gap-4">

                    <!-- icon -->
                    <div class="
                    w-14 h-14
                    rounded-2xl
                    bg-blue-50
                    flex items-center justify-center
                    text-blue-600
                    shrink-0
                    ">

                        <span class="material-symbols-outlined text-[34px]">
                            ${item.icon}
                        </span>

                    </div>

                    <!-- içerik -->
                    <div class="flex-1">

                        <div class="flex items-center gap-3 mb-2">

                            <h3 class="
                            text-xl
                            font-bold
                            text-slate-800
                            ">
                                ${item.title}
                            </h3>

                            <span class="
                            px-3 py-1
                            rounded-full
                            bg-blue-100
                            text-blue-700
                            text-xs
                            font-bold
                            ">
                                ${item.badge}
                            </span>

                        </div>

                        <p class="
                        text-slate-500
                        text-sm
                        leading-relaxed
                        mb-4
                        ">
                            ${item.desc}
                        </p>

                        <div class="flex flex-wrap gap-3">

                            <div class="
                            px-4 py-2
                            rounded-xl
                            bg-slate-100
                            text-blue-600
                            font-semibold
                            text-sm
                            ">
                                ${item.temp}°C
                            </div>

                            <div class="
                            px-4 py-2
                            rounded-xl
                            bg-slate-100
                            text-slate-600
                            text-sm
                            ">
                                ${item.weather}
                            </div>

                        </div>

                    </div>

                </div>

            </div>

        </div>
        `;
    });
}


function updatePlannerWeatherCards(){

    const tempElement =
    document.getElementById("planner-temp-change");

    const rainElement =
    document.getElementById("planner-rain");

    if(!weatherData) return;

    // saatlik veriler
    

    // ilk sıcaklık
    const firstTemp =
weatherData.temp - 3;

const lastTemp =
weatherData.temp + 1;

    // fark
    const diff =
    Math.round(lastTemp - firstTemp);

    // yağış ihtimali
    const rainChance =
    weatherData.rain || 0;

    // SICAKLIK
    if(tempElement){

        tempElement.innerHTML = `
            ${diff > 0 ? "+" : ""}
            ${diff}°C
        `;
    }

    // YAĞIŞ
    if(rainElement){

        rainElement.innerHTML = `%${rainChance}`;
    }
}

// FAVORİ ŞEHİRLERİ YÜKLE
function loadFavoriteCities(){

    const citiesContainer =
    document.getElementById("favorite-cities");

    if(!citiesContainer) return;

    const cities =
    JSON.parse(localStorage.getItem("favoriteCities")) || [];

    citiesContainer.innerHTML = "";

    cities.forEach((city,index)=>{

        citiesContainer.innerHTML += `
        
        <div class="
        flex items-center justify-between
        p-4 bg-white rounded-2xl shadow-sm">

            <div class="flex items-center gap-4">

                <span class="material-symbols-outlined text-blue-600">
                    location_on
                </span>

                <span class="font-semibold text-slate-700">
                    ${city}
                </span>

            </div>

            <span
            onclick="removeFavoriteCity(${index})"
            class="material-symbols-outlined
            text-red-400 cursor-pointer">

                delete

            </span>

        </div>
        `;
    });
}

function addFavoriteCity(){

    const city =
    prompt("Şehir adı gir");

    if(!city) return;

    const cities =
    JSON.parse(localStorage.getItem("favoriteCities")) || [];

    cities.push(city);

    localStorage.setItem(
        "favoriteCities",
        JSON.stringify(cities)
    );

    loadFavoriteCities();
}

function removeFavoriteCity(index){

    const cities =
    JSON.parse(localStorage.getItem("favoriteCities")) || [];

    cities.splice(index,1);

    localStorage.setItem(
        "favoriteCities",
        JSON.stringify(cities)
    );

    loadFavoriteCities();
}

import json
import os
import sys
from collections import OrderedDict
from datetime import datetime
from pathlib import Path

import requests
from PyQt5.QtCore import QObject, QUrl, pyqtSlot
from PyQt5.QtWebChannel import QWebChannel
from PyQt5.QtWebEngineWidgets import QWebEngineView
from PyQt5.QtWidgets import QApplication


APP_DIR = Path(sys.executable).resolve().parent if getattr(sys, "frozen", False) else Path(__file__).resolve().parent
RESOURCE_DIR = Path(getattr(sys, "_MEIPASS", APP_DIR))
DEFAULT_CITY = "Istanbul"
OPENWEATHER_BASE_URL = "https://api.openweathermap.org/data"
REQUEST_TIMEOUT = 12

WEATHER_TRANSLATIONS = {
    "Clear": "Güneşli",
    "Clouds": "Bulutlu",
    "Rain": "Yağmurlu",
    "Drizzle": "Çiseli",
    "Thunderstorm": "Fırtınalı",
    "Snow": "Karlı",
    "Mist": "Sisli",
    "Fog": "Sisli",
    "Haze": "Puslu",
}

TR_DAYS = ["PZT", "SAL", "ÇAR", "PER", "CUM", "CMT", "PAZ"]
TR_MONTHS = [
    "Ocak",
    "Şubat",
    "Mart",
    "Nisan",
    "Mayıs",
    "Haziran",
    "Temmuz",
    "Ağustos",
    "Eylül",
    "Ekim",
    "Kasım",
    "Aralık",
]


class OpenWeatherClient:
    def __init__(self, api_key):
        self.api_key = api_key
        self.session = requests.Session()

    def _get(self, endpoint, **params):
        request_params = {
            "appid": self.api_key,
            "units": "metric",
            "lang": "tr",
            **params,
        }
        response = self.session.get(
            f"{OPENWEATHER_BASE_URL}/{endpoint}",
            params=request_params,
            timeout=REQUEST_TIMEOUT,
        )
        response.raise_for_status()
        data = response.json()

        code = str(data.get("cod", "200"))
        if code not in {"200", "201"} and "message" in data:
            raise RuntimeError(data["message"])

        return data

    def current_weather(self, city):
        data = self._get("2.5/weather", q=city)
        main_weather = data["weather"][0]["main"]

        return {
            "temp": round(data["main"]["temp"]),
            "feels": round(data["main"]["feels_like"]),
            "humidity": data["main"]["humidity"],
            "wind": round(data["wind"]["speed"] * 3.6),
            "desc": WEATHER_TRANSLATIONS.get(main_weather, main_weather),
            "city": data["name"],
            "rain_mm": data.get("rain", {}).get("1h", 0),
            "lat": data["coord"]["lat"],
            "lon": data["coord"]["lon"],
        }

    def forecast_raw(self, city):
        data = self._get("2.5/forecast", q=city)
        if "list" not in data:
            raise RuntimeError("Forecast response does not contain list data.")
        return data

    def forecast(self, city):
        data = self.forecast_raw(city)
        grouped = OrderedDict()

        for item in data["list"]:
            date_key = item["dt_txt"].split(" ")[0]
            grouped.setdefault(date_key, []).append(item)

        result = []
        for index, (date_key, items) in enumerate(list(grouped.items())[:5]):
            temps = [item["main"]["temp"] for item in items]
            weathers = [item["weather"][0]["main"] for item in items]
            date_obj = datetime.strptime(date_key, "%Y-%m-%d")

            min_temp = round(min(temps))
            max_temp = round(max(temps))
            main_weather = max(weathers, key=weathers.count)

            result.append(
                {
                    "day": TR_DAYS[date_obj.weekday()],
                    "date": f"{date_obj.day} {TR_MONTHS[date_obj.month - 1]}",
                    "min": min_temp,
                    "max": max_temp,
                    "weather": main_weather,
                    "temp": round((min_temp + max_temp) / 2),
                    "humidity": round(
                        sum(item["main"]["humidity"] for item in items) / len(items)
                    ),
                    "wind": round(
                        sum(item["wind"]["speed"] for item in items) / len(items) * 3.6
                    ),
                    "feels": round(
                        sum(item["main"]["feels_like"] for item in items) / len(items)
                    ),
                    "rain": round(
                        sum(item.get("pop", 0) * 100 for item in items) / len(items)
                    ),
                    "index": index,
                }
            )

        return result

    def hourly(self, city):
        data = self.forecast_raw(city)
        current_hour = datetime.now().hour
        grouped = OrderedDict()

        for item in data["list"]:
            date_key, time_value = item["dt_txt"].split(" ")
            time_label = time_value[:5]
            hour = int(time_label.split(":")[0])

            grouped.setdefault(date_key, [])
            first_date = next(iter(grouped))
            if date_key == first_date and hour < current_hour:
                continue

            if len(grouped[date_key]) >= 8:
                continue

            grouped[date_key].append(
                (
                    time_label,
                    round(item["main"]["temp"]),
                    int(item.get("pop", 0) * 100),
                    item["main"]["humidity"],
                    round(item["wind"]["speed"] * 3.6),
                    round(item["main"]["feels_like"]),
                    item["weather"][0]["main"],
                )
            )

        if not grouped:
            return None

        first_date = next(iter(grouped))
        next_hours = []
        for items in grouped.values():
            next_hours.extend(items)
        grouped[first_date] = next_hours[:8]

        return grouped

    def analysis_data(self, city):
        data = self.forecast_raw(city)
        items = data["list"][:8]

        return {
            "labels": [item["dt_txt"][11:16] for item in items],
            "temps": [round(item["main"]["temp"]) for item in items],
            "feels": [round(item["main"]["feels_like"]) for item in items],
        }

    def analysis_cards(self, city):
        weather = self.current_weather(city)
        forecast_data = self.forecast_raw(city)

        return {
            "humidity": weather["humidity"],
            "wind": weather["wind"],
            "rain": round(forecast_data["list"][0].get("pop", 0) * 100),
            "uv": self.uv_index(weather["lat"], weather["lon"]),
            "aqi": self.air_quality(weather["lat"], weather["lon"]),
        }

    def uv_index(self, lat, lon):
        try:
            data = self._get(
                "3.0/onecall",
                lat=lat,
                lon=lon,
                exclude="minutely,hourly,daily,alerts",
            )
            return round(data.get("current", {}).get("uvi", 4))
        except (requests.RequestException, RuntimeError, ValueError, KeyError):
            return 4

    def air_quality(self, lat, lon):
        try:
            data = self._get("2.5/air_pollution", lat=lat, lon=lon)
            aqi = data["list"][0]["main"]["aqi"]
        except (requests.RequestException, RuntimeError, ValueError, KeyError):
            return 50

        return {1: 25, 2: 50, 3: 100, 4: 150, 5: 200}.get(aqi, 50)


def period_temperatures(hourly_data, fallback_temp):
    periods = {
        "morning": [],
        "noon": [],
        "evening": [],
    }

    if hourly_data:
        for items in hourly_data.values():
            for item in items:
                hour = int(item[0].split(":")[0])
                temp = item[1]

                if 8 <= hour < 12:
                    periods["morning"].append(temp)
                elif 12 <= hour < 17:
                    periods["noon"].append(temp)
                elif hour >= 17:
                    periods["evening"].append(temp)

    return {
        key: round(sum(values) / len(values)) if values else fallback_temp
        for key, values in periods.items()
    }


def average_rain_chance(hourly_data):
    if not hourly_data:
        return 0

    first_day = next(iter(hourly_data.values()), [])
    rain_values = [item[2] for item in first_day if len(item) > 2]
    if not rain_values:
        return 0

    return round(sum(rain_values) / len(rain_values))


def load_local_env():
    env_path = APP_DIR / ".env"
    if not env_path.exists():
        return

    for raw_line in env_path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue

        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


class Bridge(QObject):
    def __init__(self, view, weather_client):
        super().__init__()
        self.view = view
        self.weather_client = weather_client
        self.selected_city = DEFAULT_CITY

    def _json(self, data):
        return json.dumps(data, ensure_ascii=False)

    def _run_js_call(self, function_name, *args):
        payload = ", ".join(self._json(arg) for arg in args)
        self.view.page().runJavaScript(f"{function_name}({payload})")

    def _show_error(self, message="Hava durumu verisi alınamadı."):
        self._run_js_call("alert", message)

    @pyqtSlot(result=str)
    def getAnalysisData(self):
        try:
            return self._json(self.weather_client.analysis_data(self.selected_city))
        except (requests.RequestException, RuntimeError, ValueError, KeyError) as exc:
            print("Analysis data error:", exc)
            return self._json({"labels": [], "temps": [], "feels": []})

    @pyqtSlot(result=str)
    def getAnalysisCards(self):
        try:
            return self._json(self.weather_client.analysis_cards(self.selected_city))
        except (requests.RequestException, RuntimeError, ValueError, KeyError) as exc:
            print("Analysis card error:", exc)
            return self._json({"humidity": 0, "wind": 0, "rain": 0, "uv": 4, "aqi": 50})

    @pyqtSlot(str)
    def getWeather(self, city):
        city = city.strip() or self.selected_city
        self.selected_city = city

        try:
            weather = self.weather_client.current_weather(city)
            hourly = self.weather_client.hourly(city)
            forecast = self.weather_client.forecast(city)
        except (requests.RequestException, RuntimeError, ValueError, KeyError) as exc:
            print("Weather error:", exc)
            self._show_error("Şehir bulunamadı veya hava durumu verisi alınamadı.")
            return

        periods = period_temperatures(hourly, weather["temp"])
        rain_chance = average_rain_chance(hourly)

        self._run_js_call(
            "updateWeather",
            weather["temp"],
            weather["feels"],
            weather["humidity"],
            weather["wind"],
            weather["city"],
            weather["desc"],
            rain_chance,
        )

        self._run_js_call(
            "updateWearPage",
            {
                "city": weather["city"],
                "temp": weather["temp"],
                "desc": weather["desc"],
                "humidity": weather["humidity"],
                "wind": weather["wind"],
                "rain": rain_chance,
                **periods,
            },
        )

        if hourly:
            self._run_js_call("updateHourlyAll", hourly)

        if forecast:
            self._run_js_call("updateForecast", forecast)

    @pyqtSlot(int, result=str)
    def getForecastDayData(self, index):
        try:
            forecast = self.weather_client.forecast(self.selected_city)
            hourly = self.weather_client.hourly(self.selected_city)
        except (requests.RequestException, RuntimeError, ValueError, KeyError) as exc:
            print("Forecast day error:", exc)
            return self._json({})

        if index < 0 or index >= len(forecast):
            return self._json({})

        selected_day = forecast[index]
        periods = period_temperatures(hourly, selected_day["temp"])

        return self._json(
            {
                "city": self.selected_city,
                "temp": selected_day["temp"],
                "feels": selected_day["feels"],
                "humidity": selected_day["humidity"],
                "wind": selected_day["wind"],
                "rain": selected_day["rain"],
                "desc": selected_day["weather"],
                **periods,
            }
        )


def get_api_key():
    api_key = os.getenv("OPENWEATHER_API_KEY")
    if not api_key:
        raise RuntimeError(
            "OPENWEATHER_API_KEY ortam değişkeni tanımlı değil. "
            "README.md içindeki kurulum adımlarını takip edin."
        )
    return api_key


def main():
    load_local_env()

    try:
        weather_client = OpenWeatherClient(get_api_key())
    except RuntimeError as exc:
        print(exc)
        return 1

    app = QApplication(sys.argv)
    view = QWebEngineView()
    view.load(QUrl.fromLocalFile(str(RESOURCE_DIR / "index.html")))

    channel = QWebChannel()
    bridge = Bridge(view, weather_client)
    channel.registerObject("pybridge", bridge)
    view.page().setWebChannel(channel)

    view.setWindowTitle("SkyCode")
    view.showMaximized()
    return app.exec_()


if __name__ == "__main__":
    sys.exit(main())

import os
import sys
import traceback
from pathlib import Path


APP_DIR = Path(sys.executable).resolve().parent if getattr(sys, "frozen", False) else Path(__file__).resolve().parent
ERROR_LOG = APP_DIR / "skycode_error.log"


def write_error_log(message):
    ERROR_LOG.write_text(message, encoding="utf-8")


def show_native_error(message):
    try:
        import ctypes

        ctypes.windll.user32.MessageBoxW(None, message, "SkyCode Baslatilamadi", 0x10)
    except Exception:
        pass


def configure_runtime():
    os.environ.setdefault("QTWEBENGINE_CHROMIUM_FLAGS", "--disable-gpu")
    os.environ.setdefault("QT_AUTO_SCREEN_SCALE_FACTOR", "1")


def main():
    configure_runtime()

    try:
        from main import main as run_app

        return run_app() or 0
    except Exception:
        details = traceback.format_exc()
        write_error_log(details)
        show_native_error(
            "SkyCode baslatilirken hata olustu.\n\n"
            "Ayrintilar SkyCode.exe ile ayni klasordeki skycode_error.log dosyasina yazildi."
        )
        return 1


if __name__ == "__main__":
    sys.exit(main())

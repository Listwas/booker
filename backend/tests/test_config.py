import os
import subprocess
import sys
from pathlib import Path

import pytest

BACKEND = Path(__file__).resolve().parent.parent


@pytest.mark.parametrize("secret", [None, "", "change-me", "booker-dev-secret", " " * 40])
def test_auth_refuses_missing_or_weak_configuration(secret):
    env = dict(os.environ)
    env.pop("BOOKER_SECRET_KEY", None)
    if secret is not None:
        env["BOOKER_SECRET_KEY"] = secret
    result = subprocess.run([sys.executable, "-c", "import auth"], cwd=BACKEND,
                            env=env, capture_output=True, text=True)
    assert result.returncode != 0
    assert "Set BOOKER_SECRET_KEY" in result.stderr


def test_auth_accepts_configured_key():
    env = {**os.environ, "BOOKER_SECRET_KEY": "booker-config-test-only-signing-key-12345"}
    result = subprocess.run([sys.executable, "-c", "import auth"], cwd=BACKEND,
                            env=env, capture_output=True, text=True)
    assert result.returncode == 0, result.stderr

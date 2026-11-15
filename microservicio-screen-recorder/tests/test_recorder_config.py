from recordings.recorder_config import RecorderConfig


def test_recorder_disabled_without_backend_credentials(monkeypatch):
    monkeypatch.delenv('EVIDENCE_RECORDER_ENABLED', raising=False)
    monkeypatch.delenv('BACKEND_URL', raising=False)
    monkeypatch.delenv('ADMIN_API_KEY', raising=False)

    config = RecorderConfig.from_env()

    assert config.enabled is False


def test_recorder_rejects_missing_service_credentials(monkeypatch):
    monkeypatch.setenv('EVIDENCE_RECORDER_ENABLED', 'true')
    monkeypatch.delenv('BACKEND_URL', raising=False)
    monkeypatch.delenv('ADMIN_API_KEY', raising=False)

    try:
        RecorderConfig.from_env()
    except RuntimeError as error:
        assert 'BACKEND_URL' in str(error)
    else:
        raise AssertionError('Recorder must fail closed without credentials')

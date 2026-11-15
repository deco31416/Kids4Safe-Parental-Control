import pytest
from fastapi import HTTPException
from shared import security


@pytest.mark.parametrize("credential", [None, "", "wrong", "á-invalid", "🔒"])
def test_invalid_internal_credentials_are_rejected_without_server_errors(monkeypatch, credential):
    monkeypatch.setattr(security.settings, "ADMIN_API_KEY", "unit-test-key")
    with pytest.raises(HTTPException) as result:
        security.require_admin_api_key(credential)
    assert result.value.status_code == 401


@pytest.mark.parametrize("configured", ["", "   ", "change-me-in-production"])
def test_internal_authentication_fails_closed_without_configuration(monkeypatch, configured):
    monkeypatch.setattr(security.settings, "ADMIN_API_KEY", configured)
    with pytest.raises(HTTPException) as result:
        security.require_admin_api_key("change-me-in-production")
    assert result.value.status_code == 503


def test_exact_internal_credential_is_accepted(monkeypatch):
    monkeypatch.setattr(security.settings, "ADMIN_API_KEY", "unit-test-key")
    assert security.require_admin_api_key("unit-test-key") == "unit-test-key"

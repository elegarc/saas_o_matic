"""Unit tests for Spanish DNI, NIE, CIF, and international tax ID validation."""

import pytest

from app.core.exceptions import BusinessValidationError
from app.domain.tax_id_validator import normalize_tax_id, validate_tax_id


def test_normalize_tax_id_strips_separators_and_uppercases() -> None:
    """Verify spaces, hyphens, dots, and lowercase letters are normalized."""
    assert normalize_tax_id("  b-58.818 501 ") == "B58818501"


@pytest.mark.parametrize(
    "valid_spanish_id",
    [
        "12345678Z",      # Valid DNI
        "00000000T",      # Valid DNI zero-padded
        "X1234567L",      # Valid NIE (X)
        "Y0000000Z",      # Valid NIE (Y)
        "Z0000000M",      # Valid NIE (Z)
        "A58818501",      # Valid CIF numeric-only prefix (A)
        "b-58818501",     # Valid CIF numeric-only prefix (B) with hyphen/lowercase
        "P5881850A",      # Valid CIF alpha-only prefix (P)
        "Q0000000J",      # Valid CIF alpha-only prefix (Q) with 0 -> J
        "B00000000",      # Valid CIF numeric-only prefix (B) with 0 -> 0
        "C58818501",      # Valid CIF dual prefix (C) with digit
        "C5881850A",      # Valid CIF dual prefix (C) with letter
    ],
)
def test_validate_spanish_tax_id_accepts_valid_dni_nie_cif(valid_spanish_id: str) -> None:
    """Verify valid Spanish DNI, NIE, and CIF values pass and return normalized ID."""
    normalized = validate_tax_id("ES", valid_spanish_id)
    assert normalized == normalize_tax_id(valid_spanish_id)


@pytest.mark.parametrize(
    "invalid_spanish_id",
    [
        "12345678A",      # Wrong DNI check letter
        "1234567Z",       # Too short
        "12345678I",      # Excluded DNI letter
        "X1234567A",      # Wrong NIE check letter
        "W1234567L",      # Invalid NIE prefix
        "B5881850A",      # Numeric-only CIF prefix B with letter control
        "P58818501",      # Alpha-only CIF prefix P with numeric control
        "A58818509",      # Wrong CIF control digit
        "Z99999999",      # Invalid CIF/NIE structure
    ],
)
def test_validate_spanish_tax_id_rejects_invalid_values(invalid_spanish_id: str) -> None:
    """Verify invalid Spanish DNI, NIE, and CIF values raise INVALID_SPANISH_TAX_ID."""
    with pytest.raises(BusinessValidationError) as exc_info:
        validate_tax_id("ES", invalid_spanish_id)
    assert exc_info.value.code == "INVALID_SPANISH_TAX_ID"


def test_validate_non_spanish_tax_id() -> None:
    """Verify non-Spanish countries use generic alphanumeric format validation."""
    assert validate_tax_id("FR", "fr-123456789") == "FR123456789"
    with pytest.raises(BusinessValidationError) as exc_info:
        validate_tax_id("US", "123")
    assert exc_info.value.code == "INVALID_TAX_ID"


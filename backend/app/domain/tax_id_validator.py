"""Official algorithmic tax ID validation for Spain (DNI, NIE, CIF) and generic formats."""

import re

from app.core.exceptions import BusinessValidationError

_DNI_CONTROL_TABLE = "TRWAGMYFPDXBNJZSQVHLCKE"
_NIE_PREFIX_MAP = {"X": "0", "Y": "1", "Z": "2"}
_CIF_CONTROL_LETTERS = "JABCDEFGHI"

_CIF_NUMERIC_ONLY_PREFIXES = frozenset("ABEH")
_CIF_ALPHA_ONLY_PREFIXES = frozenset("PQRSNW")

_DNI_PATTERN = re.compile(r"^[0-9]{8}[A-Z]$")
_NIE_PATTERN = re.compile(r"^[XYZ][0-9]{7}[A-Z]$")
_CIF_PATTERN = re.compile(r"^[ABCDEFGHJNPQRSUVW][0-9]{7}[0-9A-J]$")
_GENERIC_TAX_ID_PATTERN = re.compile(r"^[A-Z0-9]{5,20}$")


def normalize_tax_id(raw_tax_id: str) -> str:
    """Strip whitespace, hyphens, and dots, and convert tax ID to uppercase."""
    cleaned = re.sub(r"[\s.-]+", "", raw_tax_id.strip())
    return cleaned.upper()


def _is_valid_dni(tax_id: str) -> bool:
    if not _DNI_PATTERN.match(tax_id):
        return False
    number = int(tax_id[:8])
    return tax_id[8] == _DNI_CONTROL_TABLE[number % 23]


def _is_valid_nie(tax_id: str) -> bool:
    if not _NIE_PATTERN.match(tax_id):
        return False
    mapped_number = int(_NIE_PREFIX_MAP[tax_id[0]] + tax_id[1:8])
    return tax_id[8] == _DNI_CONTROL_TABLE[mapped_number % 23]


def _is_valid_cif(tax_id: str) -> bool:
    if not _CIF_PATTERN.match(tax_id):
        return False

    prefix = tax_id[0]
    digits = [int(ch) for ch in tax_id[1:8]]
    control_char = tax_id[8]

    # 1-indexed even positions (2, 4, 6) correspond to 0-indexed positions 1, 3, 5.
    even_sum = sum(digits[1::2])

    # 1-indexed odd positions (1, 3, 5, 7) correspond to 0-indexed positions 0, 2, 4, 6.
    odd_sum = 0
    for digit in digits[0::2]:
        doubled = digit * 2
        odd_sum += (doubled // 10) + (doubled % 10)

    control_digit = (10 - ((even_sum + odd_sum) % 10)) % 10
    expected_digit = str(control_digit)
    expected_letter = _CIF_CONTROL_LETTERS[control_digit]

    if prefix in _CIF_NUMERIC_ONLY_PREFIXES:
        return control_char == expected_digit
    if prefix in _CIF_ALPHA_ONLY_PREFIXES:
        return control_char == expected_letter
    return control_char in (expected_digit, expected_letter)


def is_valid_spanish_tax_id(normalized_tax_id: str) -> bool:
    """Return True if normalized_tax_id passes official DNI, NIE, or CIF checksums."""
    if len(normalized_tax_id) != 9:
        return False
    return (
        _is_valid_dni(normalized_tax_id)
        or _is_valid_nie(normalized_tax_id)
        or _is_valid_cif(normalized_tax_id)
    )


def validate_tax_id(country_code: str, raw_tax_id: str) -> str:
    """Normalize and validate a tax ID according to the customer's country."""
    normalized = normalize_tax_id(raw_tax_id)

    if country_code == "ES":
        if not is_valid_spanish_tax_id(normalized):
            raise BusinessValidationError(
                code="INVALID_SPANISH_TAX_ID",
                message=(
                    "El identificador fiscal español (DNI/NIE/CIF) no supera "
                    "la validación oficial de control."
                ),
                details={"field": "tax_id", "country_code": country_code},
            )
        return normalized

    if not _GENERIC_TAX_ID_PATTERN.match(normalized):
        raise BusinessValidationError(
            code="INVALID_TAX_ID",
            message=(
                "El identificador fiscal debe contener entre 5 y 20 caracteres "
                "alfanuméricos válidos."
            ),
            details={"field": "tax_id", "country_code": country_code},
        )
    return normalized


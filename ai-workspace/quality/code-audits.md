
# BACKEND TESTS 

PS D:\programming\saas_o_matic\saas_o_matic\backend> .\.venv\Scripts\Activate.ps1
(.venv) PS D:\programming\saas_o_matic\saas_o_matic\backend> pytest -v
================================================================ test session starts =================================================================
platform win32 -- Python 3.12.10, pytest-9.2.0, pluggy-1.7.0 -- D:\programming\saas_o_matic\saas_o_matic\backend\.venv\Scripts\python.exe
cachedir: .pytest_cache
rootdir: D:\programming\saas_o_matic\saas_o_matic\backend
configfile: pyproject.toml
testpaths: tests
plugins: anyio-4.16.0
collected 57 items                                                                                                                                    

tests/integration/test_customers_api.py::test_create_and_fetch_spanish_customer PASSED                                                          [  1%]
tests/integration/test_customers_api.py::test_create_customer_rejects_duplicate_and_invalid_spanish_tax_id PASSED                               [  3%]
tests/integration/test_customers_api.py::test_search_customers_by_company_or_tax_id_and_404 PASSED                                              [  5%]
tests/integration/test_simulations_api.py::test_create_simulation_15_users_and_progressive_overage PASSED                                       [  7%]
tests/integration/test_simulations_api.py::test_simulation_hard_cap_rejection_and_override PASSED                                               [  8%]
tests/integration/test_simulations_api.py::test_simulation_returns_404_for_unknown_customer PASSED                                              [ 10%]
tests/integration/test_system_api.py::test_health_endpoint PASSED                                                                               [ 12%]
tests/integration/test_system_api.py::test_countries_and_plans_catalog_endpoints PASSED                                                         [ 14%]
tests/unit/test_pricing.py::test_calculate_users_cost_boundaries[0-0] PASSED                                                                    [ 15%]
tests/unit/test_pricing.py::test_calculate_users_cost_boundaries[1-1000] PASSED                                                                 [ 17%]
tests/unit/test_pricing.py::test_calculate_users_cost_boundaries[10-10000] PASSED                                                               [ 19%]
tests/unit/test_pricing.py::test_calculate_users_cost_boundaries[11-10800] PASSED                                                               [ 21%]
tests/unit/test_pricing.py::test_calculate_users_cost_boundaries[15-14000] PASSED                                                               [ 22%]
tests/unit/test_pricing.py::test_calculate_users_cost_boundaries[50-42000] PASSED                                                               [ 24%]
tests/unit/test_pricing.py::test_calculate_users_cost_boundaries[51-42500] PASSED                                                               [ 26%]
tests/unit/test_pricing.py::test_calculate_users_cost_boundaries[100-67000] PASSED                                                              [ 28%] 
tests/unit/test_pricing.py::test_calculate_extra_storage_cost_progressive[0-0] PASSED                                                           [ 29%] 
tests/unit/test_pricing.py::test_calculate_extra_storage_cost_progressive[1-50] PASSED                                                          [ 31%] 
tests/unit/test_pricing.py::test_calculate_extra_storage_cost_progressive[50-2500] PASSED                                                       [ 33%] 
tests/unit/test_pricing.py::test_calculate_extra_storage_cost_progressive[51-2580] PASSED                                                       [ 35%] 
tests/unit/test_pricing.py::test_calculate_extra_storage_cost_progressive[60-3300] PASSED                                                       [ 36%] 
tests/unit/test_pricing.py::test_calculate_extra_storage_cost_progressive[200-14500] PASSED                                                     [ 38%] 
tests/unit/test_pricing.py::test_calculate_extra_storage_cost_progressive[201-14620] PASSED                                                     [ 40%] 
tests/unit/test_pricing.py::test_calculate_extra_api_cost_progressive[0-0] PASSED                                                               [ 42%] 
tests/unit/test_pricing.py::test_calculate_extra_api_cost_progressive[1-5] PASSED                                                               [ 43%] 
tests/unit/test_pricing.py::test_calculate_extra_api_cost_progressive[1000-5] PASSED                                                            [ 45%] 
tests/unit/test_pricing.py::test_calculate_extra_api_cost_progressive[100000-500] PASSED                                                        [ 47%] 
tests/unit/test_pricing.py::test_calculate_extra_api_cost_progressive[150000-900] PASSED                                                        [ 49%] 
tests/unit/test_pricing.py::test_calculate_extra_api_cost_progressive[500000-3700] PASSED                                                       [ 50%] 
tests/unit/test_pricing.py::test_calculate_extra_api_cost_progressive[500001-3712] PASSED                                                       [ 52%] 
tests/unit/test_pricing.py::test_calculate_tax_cents_uses_round_half_up PASSED                                                                  [ 54%] 
tests/unit/test_pricing.py::test_simulation_zero_users_charges_plan_fixed_rate PASSED                                                           [ 56%] 
tests/unit/test_pricing.py::test_simulation_15_users_starter_within_limits_and_progressive_overage PASSED                                       [ 57%] 
tests/unit/test_pricing.py::test_simulation_hard_cap_rejects_over_limit_storage_or_api PASSED                                                   [ 59%]
tests/unit/test_tax_id_validator.py::test_normalize_tax_id_strips_separators_and_uppercases PASSED                                              [ 61%] 
tests/unit/test_tax_id_validator.py::test_validate_spanish_tax_id_accepts_valid_dni_nie_cif[12345678Z] PASSED                                   [ 63%] 
tests/unit/test_tax_id_validator.py::test_validate_spanish_tax_id_accepts_valid_dni_nie_cif[00000000T] PASSED                                   [ 64%] 
tests/unit/test_tax_id_validator.py::test_validate_spanish_tax_id_accepts_valid_dni_nie_cif[X1234567L] PASSED                                   [ 66%] 
tests/unit/test_tax_id_validator.py::test_validate_spanish_tax_id_accepts_valid_dni_nie_cif[Y0000000Z] PASSED                                   [ 68%] 
tests/unit/test_tax_id_validator.py::test_validate_spanish_tax_id_accepts_valid_dni_nie_cif[Z0000000M] PASSED                                   [ 70%] 
tests/unit/test_tax_id_validator.py::test_validate_spanish_tax_id_accepts_valid_dni_nie_cif[A58818501] PASSED                                   [ 71%] 
tests/unit/test_tax_id_validator.py::test_validate_spanish_tax_id_accepts_valid_dni_nie_cif[b-58818501] PASSED                                  [ 73%] 
tests/unit/test_tax_id_validator.py::test_validate_spanish_tax_id_accepts_valid_dni_nie_cif[P5881850A] PASSED                                   [ 75%] 
tests/unit/test_tax_id_validator.py::test_validate_spanish_tax_id_accepts_valid_dni_nie_cif[Q0000000J] PASSED                                   [ 77%] 
tests/unit/test_tax_id_validator.py::test_validate_spanish_tax_id_accepts_valid_dni_nie_cif[B00000000] PASSED                                   [ 78%] 
tests/unit/test_tax_id_validator.py::test_validate_spanish_tax_id_accepts_valid_dni_nie_cif[C58818501] PASSED                                   [ 80%] 
tests/unit/test_tax_id_validator.py::test_validate_spanish_tax_id_accepts_valid_dni_nie_cif[C5881850A] PASSED                                   [ 82%] 
tests/unit/test_tax_id_validator.py::test_validate_spanish_tax_id_rejects_invalid_values[12345678A] PASSED                                      [ 84%] 
tests/unit/test_tax_id_validator.py::test_validate_spanish_tax_id_rejects_invalid_values[1234567Z] PASSED                                       [ 85%] 
tests/unit/test_tax_id_validator.py::test_validate_spanish_tax_id_rejects_invalid_values[12345678I] PASSED                                      [ 87%] 
tests/unit/test_tax_id_validator.py::test_validate_spanish_tax_id_rejects_invalid_values[X1234567A] PASSED                                      [ 89%]
tests/unit/test_tax_id_validator.py::test_validate_spanish_tax_id_rejects_invalid_values[W1234567L] PASSED                                      [ 91%] 
tests/unit/test_tax_id_validator.py::test_validate_spanish_tax_id_rejects_invalid_values[B5881850A] PASSED                                      [ 92%] 
tests/unit/test_tax_id_validator.py::test_validate_spanish_tax_id_rejects_invalid_values[P58818501] PASSED                                      [ 94%] 
tests/unit/test_tax_id_validator.py::test_validate_spanish_tax_id_rejects_invalid_values[A58818509] PASSED                                      [ 96%] 
tests/unit/test_tax_id_validator.py::test_validate_spanish_tax_id_rejects_invalid_values[Z99999999] PASSED                                      [ 98%] 
tests/unit/test_tax_id_validator.py::test_validate_non_spanish_tax_id PASSED                                                                    [100%] 

================================================================== warnings summary ================================================================== 
.venv\Lib\site-packages\fastapi\testclient.py:1
  D:\programming\saas_o_matic\saas_o_matic\backend\.venv\Lib\site-packages\fastapi\testclient.py:1: StarletteDeprecationWarning: Using `httpx` with `starlette.testclient` is deprecated; install `httpx2` instead.
    from starlette.testclient import TestClient as TestClient  # noqa

-- Docs: https://docs.pytest.org/en/stable/how-to/capture-warnings.html
=========================================================== 57 passed, 1 warning in 0.97s ============================================================ 
(.venv) PS D:\programming\saas_o_matic\saas_o_matic\backend> ruff check .
All checks passed!
(.venv) PS D:\programming\saas_o_matic\saas_o_matic\backend> 


# FRONTEND TESTS

gardi@LAPTOP-9NGKAG61 MINGW64 /d/programming/saas_o_matic/saas_o_matic/frontend (main)
$ npm test -- --watch=false --browsers=ChromeHeadless

> frontend@0.0.0 test
> ng test --watch=false --browsers=ChromeHeadless

✔ Browser application bundle generation complete.
13 11 2026 14:14:25.402:INFO [karma-server]: Karma v6.4.4 server started at http://localhost:9876/
13 11 2026 14:14:25.405:INFO [launcher]: Launching browsers ChromeHeadless with concurrency unlimited
13 11 2026 14:14:25.420:INFO [launcher]: Starting browser ChromeHeadless
13 11 2026 14:14:26.221:INFO [Chrome Headless 157.0.0.0 (Windows 10)]: Connected on socket sjfTKVDSmafbPemeAAAA with id 57303272
Chrome Headless 157.0.0.0 (Windows 10): Executed 0 of 32 SUCCESSChrome Headless 157.0.0.0 (Windows 10): Executed 1 of 32 SUCCESSChrome Headless 157.0.0.0 (Windows 10): Executed 2 of 32 SUCCESSChrome Headless 157.0.0.0 (Windows 10): Executed 3 of 32 SUCCESSChrome Headless 157.0.0.0 (Windows 10): Executed 4 of 32 SUCCESSChrome Headless 157.0.0.0 (Windows 10): Executed 5 of 32 SUCCESSChrome Headless 157.0.0.0 (Windows 10): Executed 6 of 32 SUCCESSChrome Headless 157.0.0.0 (Windows 10): Executed 7 of 32 SUCCESSChrome Headless 157.0.0.0 (Windows 10): Executed 8 of 32 SUCCESSChrome Headless 157.0.0.0 (Windows 10): Executed 9 of 32 SUCCESSChrome Headless 157.0.0.0 (Windows 10): Executed 10 of 32 SUCCESChrome Headless 157.0.0.0 (Windows 10): Executed 11 of 32 SUCCESChrome Headless 157.0.0.0 (Windows 10): Executed 12 of 32 SUCCESChrome Headless 157.0.0.0 (Windows 10): Executed 13 of 32 SUCCESChrome Headless 157.0.0.0 (Windows 10): Executed 14 of 32 SUCCESChrome Headless 157.0.0.0 (Windows 10): Executed 15 of 32 SUCCESChrome Headless 157.0.0.0 (Windows 10): Executed 16 of 32 SUCCESChrome Headless 157.0.0.0 (Windows 10): Executed 17 of 32 SUCCESChrome Headless 157.0.0.0 (Windows 10): Executed 18 of 32 SUCCESChrome Headless 157.0.0.0 (Windows 10): Executed 19 of 32 SUCCESChrome Headless 157.0.0.0 (Windows 10): Executed 20 of 32 SUCCESChrome Headless 157.0.0.0 (Windows 10): Executed 21 of 32 SUCCESChrome Headless 157.0.0.0 (Windows 10): Executed 22 of 32 SUCCESChrome Headless 157.0.0.0 (Windows 10): Executed 23 of 32 SUCCESChrome Headless 157.0.0.0 (Windows 10): Executed 24 of 32 SUCCESChrome Headless 157.0.0.0 (Windows 10): Executed 25 of 32 SUCCESChrome Headless 157.0.0.0 (Windows 10): Executed 26 of 32 SUCCESChrome Headless 157.0.0.0 (Windows 10): Executed 27 of 32 SUCCESChrome Headless 157.0.0.0 (Windows 10): Executed 28 of 32 SUCCESChrome Headless 157.0.0.0 (Windows 10): Executed 29 of 32 SUCCESChrome Headless 157.0.0.0 (Windows 10): Executed 30 of 32 SUCCESChrome Headless 157.0.0.0 (Windows 10): Executed 31 of 32 SUCCESChrome Headless 157.0.0.0 (Windows 10): Executed 32 of 32 SUCCESChrome Headless 157.0.0.0 (Windows 10): Executed 32 of 32 SUCCESS (0.431 secs / 0.388 secs)
TOTAL: 32 SUCCESS

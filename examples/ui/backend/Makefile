.PHONY: test test-files test-all test-coverage install-test-deps clean

# Install test dependencies
install-test-deps:
	pip install -r test-requirements.txt

# Run all tests
test:
	pytest

# Run only files tests
test-files:
	pytest tests/test_files.py

# Run all tests with coverage
test-coverage:
	pytest --cov=services --cov-report=term-missing --cov-report=html

# Run tests in watch mode (requires pytest-watch)
test-watch:
	ptw

# Clean up test artifacts
clean:
	rm -rf .pytest_cache
	rm -rf htmlcov
	rm -rf .coverage
	find . -type d -name "__pycache__" -exec rm -rf {} +
	find . -name "*.pyc" -delete

# Show test help
help:
	@echo "Available test commands:"
	@echo "  make test              - Run all tests"
	@echo "  make test-files        - Run only files tests"
	@echo "  make test-coverage     - Run tests with coverage report"
	@echo "  make test-watch        - Run tests in watch mode (requires ptw)"
	@echo "  make install-test-deps - Install test dependencies"
	@echo "  make clean             - Clean up test artifacts"
	@echo ""
	@echo "Direct pytest commands:"
	@echo "  pytest                 - Run all tests"
	@echo "  pytest tests/          - Run all tests in tests directory"
	@echo "  pytest -k 'test_name'  - Run tests matching pattern"
	@echo "  pytest -v              - Verbose output"
	@echo "  pytest --tb=short      - Short traceback format" 
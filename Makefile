# =============================================================================
# ep_languagetool Makefile
# =============================================================================

# Automatic hostname detection
DETECTED_HOST := $(shell hostname)
HOST ?= $(DETECTED_HOST)

# Directories
SCRIPTS_DIR := ./scripts
TEMP_DIR := ./temp
USERNAME := $(USER)

# Source directories
SRC_JS := index.js lib/
STATIC_JS := static/js/
STATIC_CSS := static/css/
ALL_JS := $(SRC_JS) $(STATIC_JS)

# Shell
SHELL := /bin/bash

# Enable better error handling
.ONESHELL:
.SHELLFLAGS := -e -u -o pipefail -c

# Default target
.DEFAULT_GOAL := help

# Phony targets (targets that don't represent files)
.PHONY: help post-install update-memory-bank install-memory-bank update-rules install-rules vibe clean
.PHONY: lint lint-js lint-css lint-json format format-js format-css format-json check fix install-deps validate

# =============================================================================
# Help Target
# =============================================================================

help: ## Show this help message
	@echo "Available targets:"
	@fgrep -h "##" $(MAKEFILE_LIST) | grep -v fgrep | sed -e 's/\([^:]*\):[^#]*##\(.*\)/  \1|\2/' | column -t -s '|'

# =============================================================================
# Development Dependencies
# =============================================================================

install-deps: ## Install or verify development dependencies
	@echo "Checking development dependencies..."
	@command -v npm >/dev/null 2>&1 || { echo "Error: npm is not installed"; exit 1; }
	@if [ ! -d "node_modules" ]; then \
		echo "Installing Node.js dependencies..."; \
		npm install; \
	fi
	@echo "Checking for ESLint..."
	@if ! npm list eslint >/dev/null 2>&1; then \
		echo "Installing ESLint..."; \
		npm install --save-dev eslint eslint-config-prettier eslint-plugin-node; \
	fi
	@echo "Checking for Prettier..."
	@if ! npm list prettier >/dev/null 2>&1; then \
		echo "Installing Prettier..."; \
		npm install --save-dev prettier; \
	fi
	@echo "Checking for stylelint..."
	@if ! npm list stylelint >/dev/null 2>&1; then \
		echo "Installing stylelint..."; \
		npm install --save-dev stylelint stylelint-config-standard; \
	fi
	@echo "All dependencies installed."

# =============================================================================
# Code Quality - Linting
# =============================================================================

lint: lint-js lint-css lint-json ## Run all linters (JavaScript, CSS, JSON)

lint-js: ## Lint JavaScript files
	@echo "Linting JavaScript files..."
	@if command -v npx >/dev/null 2>&1 && npm list eslint >/dev/null 2>&1; then \
		npx eslint $(ALL_JS) --ext .js; \
	else \
		echo "ESLint not found. Run 'make install-deps' first."; \
		exit 1; \
	fi

lint-css: ## Lint CSS files
	@echo "Linting CSS files..."
	@if command -v npx >/dev/null 2>&1 && npm list stylelint >/dev/null 2>&1; then \
		npx stylelint "$(STATIC_CSS)*.css"; \
	else \
		echo "stylelint not found. Run 'make install-deps' first."; \
		exit 1; \
	fi

lint-json: ## Validate JSON files
	@echo "Validating JSON files..."
	@for file in package.json ep.json locales/*.json; do \
		if [ -f "$$file" ]; then \
			echo "  Checking $$file..."; \
			if ! python3 -m json.tool "$$file" >/dev/null 2>&1 && ! node -e "JSON.parse(require('fs').readFileSync('$$file'))" 2>/dev/null; then \
				echo "  ❌ Invalid JSON: $$file"; \
				exit 1; \
			else \
				echo "  ✓ Valid JSON: $$file"; \
			fi; \
		fi; \
	done
	@echo "All JSON files are valid."

# =============================================================================
# Code Quality - Formatting
# =============================================================================

format: format-js format-css format-json ## Format all code (JavaScript, CSS, JSON)

format-js: ## Format JavaScript files with Prettier
	@echo "Formatting JavaScript files..."
	@if command -v npx >/dev/null 2>&1 && npm list prettier >/dev/null 2>&1; then \
		npx prettier --write "$(SRC_JS)**/*.js" "$(STATIC_JS)**/*.js" "*.js"; \
	else \
		echo "Prettier not found. Run 'make install-deps' first."; \
		exit 1; \
	fi

format-css: ## Format CSS files with Prettier
	@echo "Formatting CSS files..."
	@if command -v npx >/dev/null 2>&1 && npm list prettier >/dev/null 2>&1; then \
		npx prettier --write "$(STATIC_CSS)**/*.css"; \
	else \
		echo "Prettier not found. Run 'make install-deps' first."; \
		exit 1; \
	fi

format-json: ## Format JSON files with Prettier
	@echo "Formatting JSON files..."
	@if command -v npx >/dev/null 2>&1 && npm list prettier >/dev/null 2>&1; then \
		npx prettier --write "package.json" "ep.json" "locales/*.json"; \
	else \
		echo "Prettier not found. Run 'make install-deps' first."; \
		exit 1; \
	fi

# =============================================================================
# Code Quality - Auto-fix
# =============================================================================

fix: ## Auto-fix all fixable issues (lint + format)
	@echo "Auto-fixing code issues..."
	@if command -v npx >/dev/null 2>&1; then \
		echo "Running ESLint auto-fix..."; \
		if npm list eslint >/dev/null 2>&1; then \
			npx eslint $(ALL_JS) --ext .js --fix || true; \
		fi; \
		echo "Running stylelint auto-fix..."; \
		if npm list stylelint >/dev/null 2>&1; then \
			npx stylelint "$(STATIC_CSS)*.css" --fix || true; \
		fi; \
		echo "Running Prettier..."; \
		if npm list prettier >/dev/null 2>&1; then \
			npx prettier --write "**/*.{js,json,css}" --ignore-path .prettierignore; \
		fi; \
		echo "✓ Auto-fix complete."; \
	else \
		echo "npx not found. Run 'make install-deps' first."; \
		exit 1; \
	fi

# =============================================================================
# Code Quality - Validation
# =============================================================================

check: lint ## Check code quality without fixing (alias for lint)

validate: ## Comprehensive project validation
	@echo "Running comprehensive project validation..."
	@echo ""
	@echo "==> 1. Checking JSON files..."
	@$(MAKE) lint-json
	@echo ""
	@echo "==> 2. Checking JavaScript files..."
	@$(MAKE) lint-js || true
	@echo ""
	@echo "==> 3. Checking CSS files..."
	@$(MAKE) lint-css || true
	@echo ""
	@echo "==> 4. Verifying package.json..."
	@if [ -f "package.json" ]; then \
		echo "  ✓ package.json exists"; \
		if [ -f "node_modules/.package-lock.json" ] || [ -f "package-lock.json" ]; then \
			echo "  ✓ Dependencies are installed"; \
		else \
			echo "  ⚠ Dependencies may not be installed. Run 'npm install'"; \
		fi; \
	else \
		echo "  ❌ package.json not found"; \
	fi
	@echo ""
	@echo "==> 5. Checking required plugin files..."
	@for file in ep.json index.js README.md; do \
		if [ -f "$$file" ]; then \
			echo "  ✓ $$file exists"; \
		else \
			echo "  ❌ $$file is missing"; \
		fi; \
	done
	@echo ""
	@echo "✓ Validation complete."

# =============================================================================
# Cleanup Targets
# =============================================================================

clean: ## Remove temporary directories and files
	@echo "Cleaning up temporary files..."
	@rm -rf $(TEMP_DIR)
	@rm -rf $(SCRIPTS_DIR)
	@echo "Cleanup complete."

post-install: ## Clean up after installation
	@echo "Running post-install cleanup..."
	@rm -rf $(SCRIPTS_DIR) 2>/dev/null || true
	@rm -rf $(TEMP_DIR) 2>/dev/null || true
	@echo "Post-install cleanup complete."

# =============================================================================
# Cursor Memory Bank
# =============================================================================
# Source: https://github.com/vanzan01/cursor-memory-bank
# Provides AI-powered development commands and rules for Cursor IDE

update-memory-bank: ## Update the memory bank commands and rules
	@echo "Updating Cursor Memory Bank..."
	@mkdir -p $(TEMP_DIR)
	@if git clone --depth 1 https://github.com/vanzan01/cursor-memory-bank.git $(TEMP_DIR)/cursor-memory-bank 2>/dev/null; then \
		echo "Successfully cloned cursor-memory-bank repository"; \
		if [ -d "$(TEMP_DIR)/cursor-memory-bank/.cursor/commands" ]; then \
			mkdir -p .cursor/commands; \
			cp -R $(TEMP_DIR)/cursor-memory-bank/.cursor/commands/* .cursor/commands/ && \
			echo "Commands updated successfully"; \
		else \
			echo "Warning: Commands directory not found in repository"; \
		fi; \
		if [ -d "$(TEMP_DIR)/cursor-memory-bank/.cursor/rules/isolation_rules" ]; then \
			mkdir -p .cursor/rules/isolation_rules; \
			cp -R $(TEMP_DIR)/cursor-memory-bank/.cursor/rules/isolation_rules/* .cursor/rules/isolation_rules/ && \
			echo "Isolation rules updated successfully"; \
		else \
			echo "Warning: Isolation rules directory not found in repository"; \
		fi; \
		rm -rf $(TEMP_DIR)/cursor-memory-bank; \
		echo "Memory bank update complete."; \
	else \
		echo "Error: Failed to clone cursor-memory-bank repository"; \
		echo "Please check your internet connection and try again"; \
		exit 1; \
	fi

install-memory-bank: update-memory-bank ## Install the memory bank commands and rules (alias for update)

# =============================================================================
# Awesome Cursor Rules
# =============================================================================
# Source: https://github.com/PatrickJS/awesome-cursorrules
# Collection of cursor rules for various frameworks and languages

update-rules: ## Update cursor rules for frameworks and languages
	@echo "Updating Awesome Cursor Rules..."
	@mkdir -p $(TEMP_DIR)
	@if git clone --depth 1 https://github.com/PatrickJS/awesome-cursorrules.git $(TEMP_DIR)/awesome-cursorrules 2>/dev/null; then \
		echo "Successfully cloned awesome-cursorrules repository"; \
		if [ -d "$(TEMP_DIR)/awesome-cursorrules/rules-new" ]; then \
			mkdir -p .cursor/rules; \
			cp -R $(TEMP_DIR)/awesome-cursorrules/rules-new/* .cursor/rules/ && \
			echo "Rules updated successfully"; \
		else \
			echo "Warning: Rules directory not found in repository"; \
		fi; \
		rm -rf $(TEMP_DIR)/awesome-cursorrules; \
		echo "Rules update complete."; \
	else \
		echo "Error: Failed to clone awesome-cursorrules repository"; \
		echo "Please check your internet connection and try again"; \
		exit 1; \
	fi

install-rules: update-rules ## Install cursor rules (alias for update)


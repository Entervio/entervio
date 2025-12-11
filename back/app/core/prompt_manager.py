import logging
from pathlib import Path
from typing import Any

import yaml

logger = logging.getLogger(__name__)


class PromptManager:
    _instance = None

    def __init__(self):
        self.prompts: dict[str, Any] = {}
        self.load_prompts()

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def load_prompts(self):
        """Load prompts from the YAML configuration file."""
        prompts_path = Path(__file__).parent.parent / "prompts" / "prompts.yaml"
        try:
            with open(prompts_path, encoding="utf-8") as f:
                self.prompts = yaml.safe_load(f)
            logger.info(f"✅ Prompts loaded successfully from {prompts_path}")
        except Exception as e:
            logger.error(f"❌ Failed to load prompts from {prompts_path}: {e}")
            # Initialize with empty dict to prevent crashes, though functionality will break
            self.prompts = {}

    def get(self, key_path: str, default: Any = None) -> Any:
        """
        Retrieve a prompt using dot notation (e.g., 'interview.personalities.nice').
        """
        keys = key_path.split(".")
        value = self.prompts
        for key in keys:
            if isinstance(value, dict):
                value = value.get(key)
            else:
                return default
        return value if value is not None else default

    def format_prompt(self, key_path: str, **kwargs) -> str:
        """
        Retrieve and format a prompt string.
        """
        template = self.get(key_path)
        if not isinstance(template, str):
            logger.warning(
                f"Prompt key '{key_path}' is not a string. Returned raw value."
            )
            return str(template) if template is not None else ""

        try:
            return template.format(**kwargs)
        except KeyError as e:
            logger.error(f"Missing key for prompt formatting '{key_path}': {e}")
            return template  # Return unformatted template as fallback
        except Exception as e:
            logger.error(f"Error formatting prompt '{key_path}': {e}")
            return template


# Singleton accessor
prompt_manager = PromptManager.get_instance()

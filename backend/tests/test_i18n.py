# Copyright 2026 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     https://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

"""Bilingual CLI regression tests: ZH is default, EN renders on request."""

from __future__ import annotations

import io
import os
import unittest
from contextlib import redirect_stdout
from unittest import mock


class I18nTests(unittest.TestCase):
    def test_default_is_zh(self):
        from sec_agent_harness2 import i18n as I

        with mock.patch.dict(os.environ, {}, clear=False):
            for k in ("SEC_AGENT_HARNESS2_LANG", "LANG", "LANGUAGE"):
                os.environ.pop(k, None)
            self.assertEqual(I.get_lang(), "zh")

    def test_env_zh_and_en(self):
        from sec_agent_harness2 import i18n as I

        with mock.patch.dict(os.environ, {"SEC_AGENT_HARNESS2_LANG": "zh"}):
            self.assertEqual(I.get_lang(), "zh")
        with mock.patch.dict(os.environ, {"SEC_AGENT_HARNESS2_LANG": "en"}):
            self.assertEqual(I.get_lang(), "en")
        with mock.patch.dict(os.environ, {"LANGUAGE": "en_US.UTF-8"}, clear=False):
            os.environ.pop("SEC_AGENT_HARNESS2_LANG", None)
            self.assertEqual(I.get_lang(), "en")

    def test_t_never_raises(self):
        from sec_agent_harness2 import i18n as I

        self.assertEqual(I.t("no.such.key", "zh"), "no.such.key")
        # missing format arg leaves template untouched, never raises
        self.assertIn("{", I.t("sweep.done", "zh"))

    def test_ui_help_zh(self):
        from sec_agent_harness2.cli import ui

        buf = io.StringIO()
        with mock.patch.dict(os.environ, {"SEC_AGENT_HARNESS2_LANG": "zh"}):
            with redirect_stdout(buf), self.assertRaises(SystemExit) as cm:
                ui.main(["--help"])
        self.assertEqual(cm.exception.code, 0)
        self.assertIn("可视化", buf.getvalue())

    def test_check_help_zh_default_and_en_override(self):
        from sec_agent_harness2.cli import check

        buf = io.StringIO()
        env = {k: v for k, v in os.environ.items() if k not in ("SEC_AGENT_HARNESS2_LANG", "LANG", "LANGUAGE")}
        with mock.patch.dict(os.environ, env, clear=True):
            with redirect_stdout(buf), self.assertRaises(SystemExit) as cm:
                check.main(["--help"])
        self.assertEqual(cm.exception.code, 0)
        self.assertIn("检查", buf.getvalue())

        buf_en = io.StringIO()
        with mock.patch.dict(os.environ, {**env, "SEC_AGENT_HARNESS2_LANG": "en"}, clear=True):
            with redirect_stdout(buf_en), self.assertRaises(SystemExit) as cm_en:
                check.main(["--help"])
        self.assertEqual(cm_en.exception.code, 0)
        self.assertIn("Check one installed benchmark", buf_en.getvalue())


if __name__ == "__main__":
    unittest.main()

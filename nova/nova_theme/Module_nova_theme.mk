# -*- Mode: makefile-gmake; tab-width: 4; indent-tabs-mode: t -*-
# SPDX-License-Identifier: MPL-2.0
# Copyright (c) 2026 The Nova-Office contributors

$(eval $(call gb_Module_Module,nova_theme))

$(eval $(call gb_Module_add_targets,nova_theme,\
	Library_nova_theme \
))

# vim: set noet sw=4 ts=4:

# -*- Mode: makefile-gmake; tab-width: 4; indent-tabs-mode: t -*-
# SPDX-License-Identifier: MPL-2.0
# Copyright (c) 2026 The Nova-Office contributors

$(eval $(call gb_Library_Library,nova_theme))

$(eval $(call gb_Library_use_sdk_api,nova_theme))

$(eval $(call gb_Library_set_include,nova_theme,\
	-I$(SRCDIR)/nova_theme/inc \
	$$(INCLUDE) \
))

$(eval $(call gb_Library_use_libraries,nova_theme,\
	comphelper \
	cppu \
	cppuhelper \
	sal \
	svt \
	tl \
	utl \
	vcl \
))

$(eval $(call gb_Library_set_componentfile,nova_theme,nova_theme/util/nova_theme,services))

$(eval $(call gb_Library_add_exception_objects,nova_theme,\
	nova_theme/source/themejob \
))

# vim: set noet sw=4 ts=4:

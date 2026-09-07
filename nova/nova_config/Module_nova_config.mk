# SPDX-License-Identifier: MPL-2.0
# Nova-Office configuration module — Nova.xcs schema + defaults, plus the
# generated branding overlay. Additive; registered in Repository.mk via
# patches/0001-*.patch. [VERIFY] the postprocess spool hook-up against the
# pinned source (docs/architecture-analysis.md §15).

$(eval $(call gb_Module_Module,nova_config))

$(eval $(call gb_Module_add_targets,nova_config,\
	Configuration_nova_config \
))

# vim: set noet sw=4 ts=4:

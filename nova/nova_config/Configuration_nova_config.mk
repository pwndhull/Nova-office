# SPDX-License-Identifier: MPL-2.0
# Adds the Nova settings tree (org.openoffice.Nova) to the product configuration.
#
# NOTE (verified against third_party/libreoffice, LO 25.8):
#   - The product NAME / VENDOR / VERSION are NOT set here. They come from
#     configure flags --with-product-name / --with-vendor (Setup.xcu uses
#     ${PRODUCTNAME}). scripts/nova-autogen.sh injects them from product.yaml.
#   - LibreOffice has ONE primary configuration named "registry"
#     (gb_Configuration_PRIMARY_REGISTRY_NAME). A standalone
#     Configuration_nova_config is built but, like swext's, would need
#     'nodeliver' + packaging to ship. The clean way to get Nova.xcs/.xcu into
#     the shipped .xcd is to add them to officecfg's "registry" configuration —
#     see patches/0002-officecfg-add-nova-schema.patch.todo.
#   - This .mk is kept for local `make nova_config` schema validation and as the
#     source-of-truth location for the files.

$(eval $(call gb_Configuration_Configuration,nova_config,nodeliver))

$(eval $(call gb_Configuration_add_schemas,nova_config,\
	nova/nova_config/registry/schema,\
	org/openoffice/Nova.xcs \
))

$(eval $(call gb_Configuration_add_datas,nova_config,\
	nova/nova_config/registry/data,\
	org/openoffice/Nova.xcu \
))

# vim: set noet sw=4 ts=4:

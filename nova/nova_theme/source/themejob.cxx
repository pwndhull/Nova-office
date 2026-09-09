/* -*- Mode: C++; tab-width: 4; indent-tabs-mode: nil; c-basic-offset: 4 -*- */
/*
 * SPDX-License-Identifier: MPL-2.0
 * Copyright (c) 2026 The Nova-Office contributors
 *
 * nova_theme — pushes the Nova design tokens into VCL's StyleSettings.
 *
 * ADR-0007: a synchronous UNO Job on onFirstVisibleTask, so the whole suite
 * (Writer, Calc, Impress, every dialog and menu) takes the Nova palette
 * without forking `vcl` or `desktop`.
 *
 * The palette itself is generated: nova/design-tokens -> NovaTokens.hxx.
 * Nothing here hardcodes a colour.
 */

#include <sal/config.h>

#include <com/sun/star/beans/NamedValue.hpp>
#include <com/sun/star/lang/XServiceInfo.hpp>
#include <com/sun/star/task/XJob.hpp>
#include <com/sun/star/uno/XComponentContext.hpp>

#include <comphelper/configurationhelper.hxx>
#include <cppuhelper/implbase.hxx>
#include <cppuhelper/supportsservice.hxx>
#include <cppuhelper/weak.hxx>
#include <sal/log.hxx>
#include <tools/color.hxx>
#include <vcl/settings.hxx>
#include <vcl/svapp.hxx>

#include <NovaTokens.hxx>

#include <string_view>
#include <utility>

namespace
{
/** "#rrggbb" / "#rgb" -> Color. Returns false for anything else (e.g. the
    rgba() strings the token build emits for translucent roles, which have no
    StyleSettings equivalent and are simply skipped). */
bool parseHexColor(std::string_view sv, Color& rOut)
{
    if (sv.size() < 4 || sv[0] != '#')
        return false;

    auto nybble = [](char c, int& v) -> bool {
        if (c >= '0' && c <= '9') { v = c - '0'; return true; }
        if (c >= 'a' && c <= 'f') { v = c - 'a' + 10; return true; }
        if (c >= 'A' && c <= 'F') { v = c - 'A' + 10; return true; }
        return false;
    };

    int c[6] = { 0, 0, 0, 0, 0, 0 };
    if (sv.size() == 7)
    {
        for (int i = 0; i < 6; ++i)
            if (!nybble(sv[i + 1], c[i]))
                return false;
        rOut = Color(static_cast<sal_uInt8>(c[0] * 16 + c[1]),
                     static_cast<sal_uInt8>(c[2] * 16 + c[3]),
                     static_cast<sal_uInt8>(c[4] * 16 + c[5]));
        return true;
    }
    if (sv.size() == 4)
    {
        for (int i = 0; i < 3; ++i)
            if (!nybble(sv[i + 1], c[i]))
                return false;
        rOut = Color(static_cast<sal_uInt8>(c[0] * 17), static_cast<sal_uInt8>(c[1] * 17),
                     static_cast<sal_uInt8>(c[2] * 17));
        return true;
    }
    return false;
}

using nova::tokens::ColorRole;
using nova::tokens::Theme;

/** Look a role up in the generated table; leave the target untouched if the
    token is translucent or missing, so VCL keeps its own value. */
void setFrom(Theme eTheme, ColorRole eRole, Color& rTarget)
{
    Color aColor;
    if (parseHexColor(nova::tokens::color(eTheme, eRole), aColor))
        rTarget = aColor;
}

/** Which Nova theme to apply. Reads /org.openoffice.Nova/Appearance/Theme when
    the Nova schema is registered (patch 0002); otherwise infers from the OS
    appearance, so this job is useful before that patch lands. */
Theme resolveTheme(const css::uno::Reference<css::uno::XComponentContext>& rxContext)
{
    OUString sPref;
    try
    {
        comphelper::ConfigurationHelper::readDirectKey(
            rxContext, u"org.openoffice.Nova"_ustr, u"Appearance"_ustr, u"Theme"_ustr,
            comphelper::EConfigurationModes::ReadOnly)
            >>= sPref;
    }
    catch (const css::uno::Exception&)
    {
        // Nova schema not registered yet — fall through to OS detection.
    }

    const bool bHighContrast
        = Application::GetSettings().GetStyleSettings().GetHighContrastMode();

    if (sPref == u"light")
        return bHighContrast ? Theme::HcLight : Theme::Light;
    if (sPref == u"dark")
        return bHighContrast ? Theme::HcDark : Theme::Dark;

    // "system", "hc", or unset: follow VCL's own read of the desktop.
    // MiscSettings::GetUseDarkMode() resolves the 'auto' appearance setting.
    const bool bDark = MiscSettings::GetUseDarkMode();
    if (bHighContrast)
        return bDark ? Theme::HcDark : Theme::HcLight;
    return bDark ? Theme::Dark : Theme::Light;
}

void applyNovaPalette(const css::uno::Reference<css::uno::XComponentContext>& rxContext)
{
    const Theme eTheme = resolveTheme(rxContext);

    AllSettings aAll = Application::GetSettings();
    StyleSettings aStyle = aAll.GetStyleSettings();

    // --- surfaces -------------------------------------------------------
    Color aFace = aStyle.GetFaceColor();
    setFrom(eTheme, ColorRole::BG_SURFACE, aFace);
    aStyle.SetFaceColor(aFace);

    Color aWindow = aStyle.GetWindowColor();
    setFrom(eTheme, ColorRole::BG_SURFACE, aWindow);
    aStyle.SetWindowColor(aWindow);

    Color aDialog = aStyle.GetDialogColor();
    setFrom(eTheme, ColorRole::BG_SURFACE_RAISED, aDialog);
    aStyle.SetDialogColor(aDialog);

    Color aField = aStyle.GetFieldColor();
    setFrom(eTheme, ColorRole::BG_SURFACE, aField);
    aStyle.SetFieldColor(aField);

    Color aMenu = aStyle.GetMenuColor();
    setFrom(eTheme, ColorRole::BG_SURFACE, aMenu);
    aStyle.SetMenuColor(aMenu);

    Color aMenuBar = aStyle.GetMenuBarColor();
    setFrom(eTheme, ColorRole::BG_SURFACE, aMenuBar);
    aStyle.SetMenuBarColor(aMenuBar);

    // --- text -----------------------------------------------------------
    Color aText = aStyle.GetWindowTextColor();
    setFrom(eTheme, ColorRole::TEXT_PRIMARY, aText);
    aStyle.SetWindowTextColor(aText);
    aStyle.SetFieldTextColor(aText);
    aStyle.SetDialogTextColor(aText);
    aStyle.SetButtonTextColor(aText);
    aStyle.SetMenuTextColor(aText);
    aStyle.SetMenuBarTextColor(aText);

    Color aLabel = aStyle.GetLabelTextColor();
    setFrom(eTheme, ColorRole::TEXT_SECONDARY, aLabel);
    aStyle.SetLabelTextColor(aLabel);

    Color aDisabled = aStyle.GetDisableColor();
    setFrom(eTheme, ColorRole::TEXT_DISABLED, aDisabled);
    aStyle.SetDisableColor(aDisabled);

    // --- accent, selection, focus ---------------------------------------
    Color aAccent = aStyle.GetAccentColor();
    setFrom(eTheme, ColorRole::ACCENT_SOLID, aAccent);
    aStyle.SetAccentColor(aAccent);

    Color aHighlight = aStyle.GetHighlightColor();
    setFrom(eTheme, ColorRole::ACCENT_SOLID, aHighlight);
    aStyle.SetHighlightColor(aHighlight);

    Color aHighlightText = aStyle.GetHighlightTextColor();
    setFrom(eTheme, ColorRole::TEXT_ONACCENT, aHighlightText);
    aStyle.SetHighlightTextColor(aHighlightText);

    Color aActive = aStyle.GetActiveColor();
    setFrom(eTheme, ColorRole::ACCENT_SOLID, aActive);
    aStyle.SetActiveColor(aActive);

    Color aActiveText = aStyle.GetActiveTextColor();
    setFrom(eTheme, ColorRole::TEXT_ONACCENT, aActiveText);
    aStyle.SetActiveTextColor(aActiveText);

    Color aMenuHi = aStyle.GetMenuHighlightColor();
    setFrom(eTheme, ColorRole::ACCENT_SOFT, aMenuHi);
    aStyle.SetMenuHighlightColor(aMenuHi);

    Color aMenuHiText = aStyle.GetMenuHighlightTextColor();
    setFrom(eTheme, ColorRole::ACCENT_TEXT, aMenuHiText);
    aStyle.SetMenuHighlightTextColor(aMenuHiText);

    // --- borders / separators -------------------------------------------
    Color aShadow = aStyle.GetShadowColor();
    setFrom(eTheme, ColorRole::BORDER_SUBTLE, aShadow);
    aStyle.SetShadowColor(aShadow);

    Color aLight = aStyle.GetLightColor();
    setFrom(eTheme, ColorRole::BORDER_SUBTLE, aLight);
    aStyle.SetLightColor(aLight);

    // NB: StyleSettings exposes GetSeparatorColor() but no setter — VCL derives
    // it from the shadow/face pair, which we have already set.

    aAll.SetStyleSettings(aStyle);
    Application::SetSettings(aAll);

    SAL_INFO("nova.theme", "Nova palette applied, theme index "
                               << static_cast<int>(eTheme));
}

class ThemeJob final
    : public cppu::WeakImplHelper<css::task::XJob, css::lang::XServiceInfo>
{
    css::uno::Reference<css::uno::XComponentContext> m_xContext;

public:
    explicit ThemeJob(css::uno::Reference<css::uno::XComponentContext> xContext)
        : m_xContext(std::move(xContext))
    {
    }

    // XJob
    css::uno::Any SAL_CALL
    execute(const css::uno::Sequence<css::beans::NamedValue>& /*rArgs*/) override
    {
        applyNovaPalette(m_xContext);
        return css::uno::Any();
    }

    // XServiceInfo
    OUString SAL_CALL getImplementationName() override
    {
        return u"org.novaoffice.comp.ThemeJob"_ustr;
    }
    sal_Bool SAL_CALL supportsService(const OUString& rName) override
    {
        return cppu::supportsService(this, rName);
    }
    css::uno::Sequence<OUString> SAL_CALL getSupportedServiceNames() override
    {
        return { u"org.novaoffice.ThemeJob"_ustr };
    }
};

} // anonymous namespace

extern "C" SAL_DLLPUBLIC_EXPORT css::uno::XInterface*
nova_theme_ThemeJob_get_implementation(css::uno::XComponentContext* pCtx,
                                       css::uno::Sequence<css::uno::Any> const&)
{
    return cppu::acquire(new ThemeJob(pCtx));
}

/* vim:set shiftwidth=4 softtabstop=4 expandtab: */

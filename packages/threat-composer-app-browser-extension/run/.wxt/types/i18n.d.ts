// Generated by wxt
import "wxt/browser";

declare module "wxt/browser" {
  /**
   * See https://developer.chrome.com/docs/extensions/reference/i18n/#method-getMessage
   */
  interface GetMessageOptions {
    /**
     * See https://developer.chrome.com/docs/extensions/reference/i18n/#method-getMessage
     */
    escapeLt?: boolean
  }

  export interface WxtI18n extends I18n.Static {
    /**
     * The extension or app ID; you might use this string to construct URLs for resources inside the extension. Even unlocalized extensions can use this message.
Note: You can't use this message in a manifest file.
     *
     * "<browser.runtime.id>"
     */
    getMessage(
      messageName: "@@extension_id",
      substitutions?: string | string[],
      options?: GetMessageOptions,
    ): string;
    /**
     * 
     *
     * "<browser.i18n.getUiLocale()>"
     */
    getMessage(
      messageName: "@@ui_locale",
      substitutions?: string | string[],
      options?: GetMessageOptions,
    ): string;
    /**
     * The text direction for the current locale, either "ltr" for left-to-right languages such as English or "rtl" for right-to-left languages such as Japanese.
     *
     * "<ltr|rtl>"
     */
    getMessage(
      messageName: "@@bidi_dir",
      substitutions?: string | string[],
      options?: GetMessageOptions,
    ): string;
    /**
     * If the @@bidi_dir is "ltr", then this is "rtl"; otherwise, it's "ltr".
     *
     * "<rtl|ltr>"
     */
    getMessage(
      messageName: "@@bidi_reversed_dir",
      substitutions?: string | string[],
      options?: GetMessageOptions,
    ): string;
    /**
     * If the @@bidi_dir is "ltr", then this is "left"; otherwise, it's "right".
     *
     * "<left|right>"
     */
    getMessage(
      messageName: "@@bidi_start_edge",
      substitutions?: string | string[],
      options?: GetMessageOptions,
    ): string;
    /**
     * If the @@bidi_dir is "ltr", then this is "right"; otherwise, it's "left".
     *
     * "<right|left>"
     */
    getMessage(
      messageName: "@@bidi_end_edge",
      substitutions?: string | string[],
      options?: GetMessageOptions,
    ): string;
  }
}

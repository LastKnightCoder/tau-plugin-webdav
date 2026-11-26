import { messages } from "./i18n";
import type { DisplayText, ProviderField, ProviderFormDeclaration } from "@tau/plugins";

const account: readonly ProviderField<DisplayText>[] = [
  {
    key: "url",
    label: messages.ref("account.url"),
    type: "url",
    placeholder: "https://dav.example.com/dav",
    summary: true,
  },
  { key: "username", label: messages.ref("account.username"), type: "text" },
  {
    key: "password",
    label: messages.ref("account.password"),
    type: "secret",
    description: messages.ref("account.passwordHint"),
  },
];

export const syncForm: ProviderFormDeclaration = {
  groups: [
    { title: messages.ref("account.title"), fields: account },
    {
      title: messages.ref("location.title"),
      fields: [
        {
          key: "pathPrefix",
          label: messages.ref("location.path"),
          type: "text",
          optional: true,
          placeholder: "sync",
          summary: true,
        },
      ],
    },
  ],
};

export const uploadForm: ProviderFormDeclaration = {
  groups: [
    { title: messages.ref("account.title"), fields: account },
    {
      title: messages.ref("location.title"),
      description: messages.ref("location.publicHint"),
      fields: [
        {
          key: "pathPrefix",
          label: messages.ref("location.path"),
          type: "text",
          optional: true,
          placeholder: "uploads",
          summary: true,
        },
        {
          key: "publicBaseUrl",
          label: messages.ref("location.publicBase"),
          type: "url",
          optional: true,
          description: messages.ref("location.publicBaseHint"),
        },
      ],
    },
  ],
};

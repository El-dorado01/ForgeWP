import { defineWpRoles } from '@forgewp/react';

export const roles = defineWpRoles({
  "administrator": [
    "manage_options",
    "edit_theme_options",
    "edit_posts",
    "edit_others_posts",
    "publish_posts",
    "read"
  ],
  "editor": [
    "edit_posts",
    "edit_others_posts",
    "publish_posts",
    "read"
  ],
  "author": [
    "edit_posts",
    "publish_posts",
    "read"
  ],
  "subscriber": [
    "read"
  ],
  "customer": [
    "read"
  ]
});

export default roles;

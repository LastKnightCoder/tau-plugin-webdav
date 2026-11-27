# WebDAV Storage

Sync your Tau notes, conversations, and attachments to any WebDAV-compatible cloud drive or NAS, or automatically upload images and attachments to WebDAV using your username and password. Access the same library across desktop and mobile devices.

## Getting Started

1. Install **WebDAV Storage** from the Plugin Center, then enable it under **Installed** on the Plugins page.
2. Open **Settings** on the plugin details page and configure sync or upload as needed with your **Service URL**, **Username**, and **Password** (use an app password for services such as Nutstore). **Directory** is optional. For asset uploads with a custom domain, also fill in **Public URL prefix**.
3. Save and test the connection, then select WebDAV under **Settings → Sync** or **Settings → Resource storage**. Saving settings does not automatically switch your active service.

## FAQ

**Sync fails even though my username and password are correct?** Some cloud drives only implement part of the WebDAV specification and do not support all operations Tau sync requires. To avoid overwriting your data, sync stops automatically; in this case, switch to another WebDAV provider.

**Upload succeeded, but the image link will not open?** The directory used for uploads must be publicly accessible, or **Public URL prefix** must point to a publicly accessible URL.

**Can multiple libraries share the same storage location?** No. Use a separate storage location for each library (you can separate them using **Directory**), otherwise data will overwrite each other.

**Does disabling the plugin delete my data?** No. Both your settings and synced data stay intact and work again once you re-enable the plugin. You cannot disable or uninstall the plugin while a sync is in progress; wait until it finishes first.

## Notes

- Works on desktop and mobile. Sync and upload credentials are configured separately and do not affect each other.
- When switching to a different server or directory, make sure it contains the same synced data as before so an empty directory is not treated as new data.

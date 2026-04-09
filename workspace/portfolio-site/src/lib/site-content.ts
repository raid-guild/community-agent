export interface SiteContentTextBlock {
  title: string;
  intro: string;
}

export interface SiteContent {
  shell: {
    brandName: string;
    logoUrl: string;
    logoAlt: string;
    sidebarTitle: string;
    sidebarCopy: string;
    workspaceLabel: string;
    sessionLabel: string;
    guestLabel: string;
    signInLabel: string;
  };
  navigation: {
    overview: string;
    home: string;
    members: string;
    leaderboard: string;
    admin: string;
  };
  pages: {
    overview: SiteContentTextBlock;
    homeSignedOut: SiteContentTextBlock;
    home: SiteContentTextBlock;
    accountSignedOut: SiteContentTextBlock;
    account: SiteContentTextBlock;
    members: SiteContentTextBlock;
    leaderboard: SiteContentTextBlock;
    login: SiteContentTextBlock;
    adminSignedOut: SiteContentTextBlock;
    admin: SiteContentTextBlock;
    adminRequestsSignedOut: SiteContentTextBlock;
    adminRequests: SiteContentTextBlock;
    adminBadgesSignedOut: SiteContentTextBlock;
    adminBadges: SiteContentTextBlock;
    adminPointsSignedOut: SiteContentTextBlock;
    adminPoints: SiteContentTextBlock;
    adminContentSignedOut: SiteContentTextBlock;
    adminContent: SiteContentTextBlock;
    adminHomeModulesSignedOut: SiteContentTextBlock;
    adminHomeModules: SiteContentTextBlock;
    publicProfile: SiteContentTextBlock;
  };
}

export const defaultSiteContent: SiteContent = {
  shell: {
    brandName: 'Prism Agent',
    logoUrl: '',
    logoAlt: 'Prism Agent logo',
    sidebarTitle: 'Profiles, points, and operator tooling.',
    sidebarCopy:
      'A member directory and operations surface with explicit boundaries between SQLite app state, Prism community memory, and agent continuity.',
    workspaceLabel: 'Workspace',
    sessionLabel: 'Session',
    guestLabel: 'Guest mode',
    signInLabel: 'Sign in',
  },
  navigation: {
    overview: 'Overview',
    home: 'Home',
    members: 'Members',
    leaderboard: 'Leaderboard',
    admin: 'Admin',
  },
  pages: {
    overview: {
      title: 'Overview',
      intro:
        'The public shell reads from the live API and normalized integration metadata without collapsing the boundary between app state, community memory, and agent continuity.',
    },
    homeSignedOut: {
      title: 'Home',
      intro: 'The member home only renders private data when the backend session cookie is present.',
    },
    home: {
      title: 'Home',
      intro: 'Your member home shows the current profile summary, live points activity, and a quick-edit drawer for essentials.',
    },
    accountSignedOut: {
      title: 'Profile settings',
      intro: 'The editable account view is ready, but it requires a valid session cookie from the backend auth layer.',
    },
    account: {
      title: 'Profile settings',
      intro:
        'This page is the first profile-management surface aligned with the design brief: essentials first, sectioned editing, and clear visibility controls.',
    },
    members: {
      title: 'Member directory',
      intro:
        'This page consumes the normalized `/api/members` endpoint with live search and taxonomy filters, moving the directory closer to the design brief.',
    },
    leaderboard: {
      title: 'Leaderboard',
      intro:
        'This ranking view is already backed by the live points aggregation endpoint and can expand into time-bounded tabs later.',
    },
    login: {
      title: 'Sign in',
      intro:
        'This auth surface now supports both operator sign-in and member registration against the same normalized backend auth routes.',
    },
    adminSignedOut: {
      title: 'Admin',
      intro:
        'The admin page already points at the protected backend endpoint, but it only resolves when the session belongs to an admin user.',
    },
    admin: {
      title: 'Admin',
      intro:
        'Use the admin tabs to move between the member table, change requests, and badge catalog without mixing unrelated workflows on one screen.',
    },
    adminRequestsSignedOut: {
      title: 'Change requests',
      intro: 'The change-request board is an admin-only surface for triage, points actions, and badge awards.',
    },
    adminRequests: {
      title: 'Change requests',
      intro:
        'Triage operational requests, run points or badge actions, and move items through their resolution states without crowding the member table.',
    },
    adminBadgesSignedOut: {
      title: 'Badge catalog',
      intro: 'The badge catalog is an admin-only surface for managing reusable badge definitions and images.',
    },
    adminBadges: {
      title: 'Badge catalog',
      intro:
        'A dedicated admin subpage for reusable badge definitions, image management, and quick catalog hygiene without crowding the ops board.',
    },
    adminPointsSignedOut: {
      title: 'Points audit',
      intro: 'The points audit is an admin-only surface for reviewing individual ledger events.',
    },
    adminPoints: {
      title: 'Points audit',
      intro:
        'Review individual points ledger events with the target member, source, reason, and actor who initiated the change when available.',
    },
    adminContentSignedOut: {
      title: 'Brand and copy',
      intro: 'The brand and copy editor is an admin-only surface for runtime shell and page wording.',
    },
    adminContent: {
      title: 'Brand and copy',
      intro: 'Edit the runtime JSON for brand, navigation, and page title or intro copy with validation before saving.',
    },
    adminHomeModulesSignedOut: {
      title: 'Home modules',
      intro: 'The home-modules manager is an admin-only surface for ordering and configuring the member home stack.',
    },
    adminHomeModules: {
      title: 'Home modules',
      intro: 'Enable, order, and configure the built-in member home modules without rebuilding the site.',
    },
    publicProfile: {
      title: 'Public profile',
      intro:
        'A handle-based public profile sourced from the live `/api/profiles/:handle` endpoint with the current visibility rules applied server-side.',
    },
  },
};
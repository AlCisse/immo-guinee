//! Role-based access control.
//!
//! Six fixed roles and eleven permissions (see constitution "Rôles et Permissions").
//! The mapping is a static table — no policy engine, since roles are fixed and
//! authorization is checked against the `role` claim carried in the JWT.

/// Application roles. Parsed from the `role` claim (lowercase snake_case).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Role {
    Admin,
    Moderator,
    Mediator,
    Proprietaire,
    Chercheur,
    Agence,
}

/// Administrative permissions granted by role.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Permission {
    ManageUsers,
    ManageRoles,
    ManageListings,
    ManageContracts,
    ManagePayments,
    ManageCertifications,
    ViewAnalytics,
    ModerateContent,
    ModerateListings,
    ModerateRatings,
    ResolveDisputes,
}

impl std::str::FromStr for Role {
    type Err = ();

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        Ok(match s {
            "admin" => Role::Admin,
            "moderator" => Role::Moderator,
            "mediator" => Role::Mediator,
            "proprietaire" => Role::Proprietaire,
            "chercheur" => Role::Chercheur,
            "agence" => Role::Agence,
            _ => return Err(()),
        })
    }
}

impl Role {
    /// The permissions this role holds. Non-staff roles (proprietaire, chercheur,
    /// agence) hold none — their actions are authorized by resource ownership.
    pub fn permissions(self) -> &'static [Permission] {
        use Permission::*;
        match self {
            Role::Admin => &[
                ManageUsers, ManageRoles, ManageListings, ManageContracts, ManagePayments,
                ManageCertifications, ViewAnalytics, ModerateContent, ModerateListings,
                ModerateRatings, ResolveDisputes,
            ],
            Role::Moderator => &[ModerateContent, ModerateListings, ModerateRatings],
            Role::Mediator => &[ResolveDisputes],
            Role::Proprietaire | Role::Chercheur | Role::Agence => &[],
        }
    }

    pub fn has(self, perm: Permission) -> bool {
        self.permissions().contains(&perm)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn admin_holds_every_permission() {
        assert!(Role::Admin.has(Permission::ManagePayments));
        assert!(Role::Admin.has(Permission::ResolveDisputes));
    }

    #[test]
    fn moderator_is_scoped_to_moderation() {
        assert!(Role::Moderator.has(Permission::ModerateListings));
        assert!(!Role::Moderator.has(Permission::ManagePayments));
    }

    #[test]
    fn end_user_roles_hold_no_admin_permissions() {
        assert!(Role::Proprietaire.permissions().is_empty());
        assert!(Role::Chercheur.permissions().is_empty());
        assert!(Role::Agence.permissions().is_empty());
    }

    #[test]
    fn role_parsing() {
        assert_eq!("admin".parse::<Role>(), Ok(Role::Admin));
        assert_eq!("mediator".parse::<Role>(), Ok(Role::Mediator));
        assert!("unknown".parse::<Role>().is_err());
    }
}

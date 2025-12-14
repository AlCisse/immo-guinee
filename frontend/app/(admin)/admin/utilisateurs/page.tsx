'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { clsx } from 'clsx';
import apiClient from '@/lib/api/client';
import { getStatusColor, formatDate } from '@/lib/colors';
import {
  Users,
  Shield,
  UserCheck,
  UserX,
  Filter,
  Search,
  Eye,
  Edit,
  X,
  Check,
  AlertCircle,
  Crown,
  Briefcase,
  User as UserIcon,
  Home,
  Building2,
  Phone,
  Mail,
  Calendar,
  Ban,
  Loader2,
} from 'lucide-react';
import { ColoredStatsCard } from '@/components/ui/StatsCard';
import toast from 'react-hot-toast';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

interface User {
  id: string;
  nom_complet: string;
  telephone: string;
  email?: string;
  type_compte: string;
  badge?: string;
  statut_verification: string;
  is_active: boolean;
  is_suspended: boolean;
  created_at: string;
  roles?: string[];
}

// Fonction pour obtenir le statut utilisateur
const getUserStatus = (user: User): { label: string; color: string } => {
  if (!user.is_active && user.is_suspended) {
    return { label: 'Banni', color: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400' };
  }
  if (user.is_suspended) {
    return { label: 'Suspendu', color: 'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400' };
  }
  if (!user.is_active) {
    return { label: 'Inactif', color: 'bg-gray-100 text-gray-700 dark:bg-gray-500/20 dark:text-gray-400' };
  }
  return { label: 'Actif', color: 'bg-success-100 text-success-700 dark:bg-success-500/20 dark:text-success-400' };
};

interface Role {
  id: number;
  name: string;
  users_count: number;
}

const roleConfig: Record<string, { color: string; icon: React.ElementType; label: string }> = {
  admin: { color: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400', icon: Crown, label: 'Admin' },
  moderator: { color: 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400', icon: Shield, label: 'Modérateur' },
  mediator: { color: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400', icon: Briefcase, label: 'Médiateur' },
  proprietaire: { color: 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400', icon: Home, label: 'Propriétaire' },
  chercheur: { color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400', icon: UserIcon, label: 'Chercheur' },
  agence: { color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-400', icon: Building2, label: 'Agence' },
};

export default function UtilisateursPage() {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<{
    search?: string;
    role?: string;
    statut?: string;
    page?: number;
  }>({});
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [showUserInfoModal, setShowUserInfoModal] = useState(false);

  // Fetch users
  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ['admin', 'users', filters],
    queryFn: async () => {
      const response = await apiClient.get('/admin/users', { params: filters });
      return response.data;
    },
  });

  // Fetch roles
  const { data: rolesData } = useQuery({
    queryKey: ['admin', 'roles'],
    queryFn: async () => {
      const response = await apiClient.get('/admin/roles');
      return response.data;
    },
  });

  // Sync roles mutation
  const syncRolesMutation = useMutation({
    mutationFn: async ({ userId, roles }: { userId: string; roles: string[] }) => {
      const response = await apiClient.post(`/admin/users/${userId}/roles/sync`, { roles });
      return response.data;
    },
    onSuccess: () => {
      toast.success('Rôles mis à jour avec succès');
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'roles'] });
      setShowRoleModal(false);
      setSelectedUser(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erreur lors de la mise à jour des rôles');
    },
  });

  // User action mutation (activate, deactivate, suspend, unsuspend, ban)
  const userActionMutation = useMutation({
    mutationFn: async ({ userId, action }: { userId: string; action: 'activate' | 'deactivate' | 'suspend' | 'unsuspend' | 'ban' }) => {
      const response = await apiClient.post(`/admin/users/${userId}`, { action });
      return response.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Action effectuée');
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      setShowUserInfoModal(false);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erreur lors de la mise à jour');
    },
  });

  const users = usersData?.data || [];
  const roles = rolesData?.data || [];
  const total = usersData?.meta?.total || 0;
  const activeCount = users.filter((u: User) => u.is_active).length;
  const verifiedCount = users.filter((u: User) => u.statut_verification === 'VERIFIE').length;

  const openRoleModal = (user: User) => {
    setSelectedUser(user);
    setSelectedRoles(user.roles || []);
    setShowRoleModal(true);
  };

  const openUserInfoModal = (user: User) => {
    setSelectedUser(user);
    setShowUserInfoModal(true);
  };

  const toggleRole = (roleName: string) => {
    setSelectedRoles(prev =>
      prev.includes(roleName)
        ? prev.filter(r => r !== roleName)
        : [...prev, roleName]
    );
  };

  const handleSaveRoles = () => {
    if (selectedUser) {
      syncRolesMutation.mutate({ userId: selectedUser.id, roles: selectedRoles });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
          <Users className="w-7 h-7 text-primary-500" />
          Gestion des utilisateurs
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Gérez les utilisateurs et attribuez des rôles
        </p>
      </div>

      {/* Content */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-6"
      >
        {/* Stats Grid */}
        <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <ColoredStatsCard
            title="Total utilisateurs"
            value={total}
            change={5}
            color="secondary"
          />
          <ColoredStatsCard
            title="Utilisateurs actifs"
            value={activeCount}
            change={8}
            color="success"
          />
          <ColoredStatsCard
            title="Vérifiés"
            value={verifiedCount}
            change={12}
            color="purple"
          />
          <ColoredStatsCard
            title="Rôles"
            value={roles.length}
            change={0}
            color="pink"
          />
        </motion.div>

        {/* Roles Overview */}
        <motion.div
          variants={itemVariants}
          className="bg-white dark:bg-dark-card rounded-2xl p-6 shadow-soft"
        >
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary-500" />
            Répartition des rôles
          </h3>
          <div className="flex flex-wrap gap-3">
            {roles.map((role: Role) => {
              const config = roleConfig[role.name] || { color: 'bg-gray-100 text-gray-700', icon: UserIcon, label: role.name };
              const IconComponent = config.icon;
              return (
                <button
                  key={role.id}
                  onClick={() => setFilters({ ...filters, role: filters.role === role.name ? undefined : role.name, page: 1 })}
                  className={clsx(
                    'flex items-center gap-2 px-4 py-2 rounded-xl transition-all',
                    filters.role === role.name
                      ? 'ring-2 ring-primary-500 ring-offset-2'
                      : 'hover:scale-105',
                    config.color
                  )}
                >
                  <IconComponent className="w-4 h-4" />
                  <span className="font-medium">{config.label}</span>
                  <span className="px-2 py-0.5 bg-white/50 dark:bg-black/20 rounded-full text-xs font-bold">
                    {role.users_count}
                  </span>
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* Filters */}
        <motion.div
          variants={itemVariants}
          className="bg-white dark:bg-dark-card rounded-2xl p-6 shadow-soft"
        >
          <div className="flex flex-wrap gap-4 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
              <input
                type="text"
                placeholder="Rechercher par nom ou téléphone..."
                value={filters.search || ''}
                onChange={(e) => setFilters({ ...filters, search: e.target.value || undefined, page: 1 })}
                className="w-full pl-10 pr-4 py-2 bg-neutral-50 dark:bg-dark-hover border border-neutral-200 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            <select
              value={filters.statut || ''}
              onChange={(e) => setFilters({ ...filters, statut: e.target.value || undefined, page: 1 })}
              className="px-4 py-2 bg-neutral-50 dark:bg-dark-hover border border-neutral-200 dark:border-dark-border rounded-xl focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Tous les statuts</option>
              <option value="active">Actifs</option>
              <option value="inactive">Inactifs</option>
              <option value="verified">Vérifiés</option>
              <option value="unverified">Non vérifiés</option>
            </select>

            {(filters.search || filters.role || filters.statut) && (
              <button
                onClick={() => setFilters({})}
                className="text-sm text-primary-500 hover:text-primary-600 font-medium flex items-center gap-1"
              >
                <X className="w-4 h-4" />
                Réinitialiser
              </button>
            )}
          </div>
        </motion.div>

        {/* Users Table */}
        <motion.div
          variants={itemVariants}
          className="bg-white dark:bg-dark-card rounded-2xl shadow-soft overflow-hidden"
        >
          {usersLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-neutral-50 dark:bg-dark-hover border-b border-neutral-200 dark:border-dark-border">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">Utilisateur</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">Contact</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">Type</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">Rôles</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">Statut</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">Inscription</th>
                      <th className="px-6 py-4 text-right text-xs font-semibold text-neutral-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 dark:divide-dark-border">
                    {users.map((user: User, index: number) => (
                      <motion.tr
                        key={user.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="hover:bg-neutral-50 dark:hover:bg-dark-hover transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-primary-100 to-primary-200 dark:from-primary-500/20 dark:to-primary-500/10 rounded-xl flex items-center justify-center">
                              <span className="text-primary-600 dark:text-primary-400 font-semibold">
                                {user.nom_complet.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <div className="font-medium text-neutral-900 dark:text-white">{user.nom_complet}</div>
                              {user.badge && (
                                <span className={clsx(
                                  'text-xs px-2 py-0.5 rounded-full',
                                  user.badge === 'DIAMANT' && 'bg-purple-100 text-purple-700',
                                  user.badge === 'OR' && 'bg-yellow-100 text-yellow-700',
                                  user.badge === 'ARGENT' && 'bg-gray-100 text-gray-700',
                                  user.badge === 'BRONZE' && 'bg-orange-100 text-orange-700',
                                )}>
                                  {user.badge}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-neutral-900 dark:text-white">{user.telephone}</div>
                          {user.email && (
                            <div className="text-sm text-neutral-500 truncate max-w-[180px]">{user.email}</div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-neutral-700 dark:text-neutral-300">{user.type_compte}</span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1">
                            {user.roles && user.roles.length > 0 ? (
                              user.roles.map((role) => {
                                const config = roleConfig[role] || { color: 'bg-gray-100 text-gray-700', icon: UserIcon, label: role };
                                return (
                                  <span
                                    key={role}
                                    className={clsx('text-xs px-2 py-1 rounded-full font-medium', config.color)}
                                  >
                                    {config.label}
                                  </span>
                                );
                              })
                            ) : (
                              <span className="text-sm text-neutral-400">Aucun rôle</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1">
                            <span className={clsx(
                              'px-2 py-1 text-xs font-medium rounded-full w-fit',
                              getUserStatus(user).color
                            )}>
                              {getUserStatus(user).label}
                            </span>
                            <span className={clsx(
                              'px-2 py-1 text-xs font-medium rounded-full w-fit',
                              getStatusColor(user.statut_verification)
                            )}>
                              {user.statut_verification.replace(/_/g, ' ')}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-neutral-700 dark:text-neutral-300">
                            {new Date(user.created_at).toLocaleDateString('fr-FR')}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => openUserInfoModal(user)}
                              className="p-2 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-colors"
                              title="Voir les informations"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => openRoleModal(user)}
                              className="p-2 bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400 rounded-lg hover:bg-primary-100 dark:hover:bg-primary-500/20 transition-colors"
                              title="Gérer les rôles"
                            >
                              <Shield className="w-4 h-4" />
                            </button>
                            {/* Bouton Suspendre/Lever suspension */}
                            <button
                              onClick={() => userActionMutation.mutate({
                                userId: user.id,
                                action: user.is_suspended ? 'unsuspend' : 'suspend'
                              })}
                              className={clsx(
                                'p-2 rounded-lg transition-colors',
                                user.is_suspended
                                  ? 'bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-500/20'
                                  : 'bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 hover:bg-orange-100 dark:hover:bg-orange-500/20'
                              )}
                              title={user.is_suspended ? 'Lever la suspension' : 'Suspendre'}
                            >
                              {user.is_suspended ? <UserCheck className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                            </button>
                            {/* Bouton Activer/Désactiver */}
                            <button
                              onClick={() => userActionMutation.mutate({
                                userId: user.id,
                                action: user.is_active ? 'deactivate' : 'activate'
                              })}
                              className={clsx(
                                'p-2 rounded-lg transition-colors',
                                user.is_active
                                  ? 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/20'
                                  : 'bg-success-50 dark:bg-success-500/10 text-success-600 dark:text-success-400 hover:bg-success-100 dark:hover:bg-success-500/20'
                              )}
                              title={user.is_active ? 'Désactiver' : 'Activer'}
                            >
                              {user.is_active ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {users.length === 0 && (
                <div className="text-center py-12">
                  <Users className="w-12 h-12 mx-auto mb-4 text-neutral-300" />
                  <p className="text-neutral-500">Aucun utilisateur trouvé</p>
                </div>
              )}
            </>
          )}
        </motion.div>

        {/* Pagination */}
        {usersData?.meta?.last_page > 1 && (
          <motion.div
            variants={itemVariants}
            className="flex items-center justify-between"
          >
            <p className="text-sm text-neutral-500">
              Page {usersData.meta.current_page} sur {usersData.meta.last_page}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setFilters({ ...filters, page: (filters.page || 1) - 1 })}
                disabled={(usersData.meta.current_page || 1) <= 1}
                className="px-4 py-2 text-sm bg-white dark:bg-dark-card border border-neutral-200 dark:border-dark-border rounded-xl hover:bg-neutral-50 dark:hover:bg-dark-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Précédent
              </button>
              <button
                onClick={() => setFilters({ ...filters, page: (filters.page || 1) + 1 })}
                disabled={(usersData.meta.current_page || 1) >= usersData.meta.last_page}
                className="px-4 py-2 text-sm bg-white dark:bg-dark-card border border-neutral-200 dark:border-dark-border rounded-xl hover:bg-neutral-50 dark:hover:bg-dark-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Suivant
              </button>
            </div>
          </motion.div>
        )}
      </motion.div>

      {/* Role Management Modal */}
      <AnimatePresence>
        {showRoleModal && selectedUser && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowRoleModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-dark-card rounded-2xl shadow-xl max-w-md w-full p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Shield className="w-5 h-5 text-primary-500" />
                  Gérer les rôles
                </h3>
                <button
                  onClick={() => setShowRoleModal(false)}
                  className="p-2 hover:bg-neutral-100 dark:hover:bg-dark-hover rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mb-6">
                <div className="flex items-center gap-3 p-3 bg-neutral-50 dark:bg-dark-hover rounded-xl mb-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-primary-100 to-primary-200 dark:from-primary-500/20 dark:to-primary-500/10 rounded-xl flex items-center justify-center">
                    <span className="text-primary-600 dark:text-primary-400 font-semibold">
                      {selectedUser.nom_complet.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <div className="font-medium text-neutral-900 dark:text-white">{selectedUser.nom_complet}</div>
                    <div className="text-sm text-neutral-500">{selectedUser.telephone}</div>
                  </div>
                </div>

                <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">
                  Sélectionnez les rôles à attribuer à cet utilisateur :
                </p>

                <div className="space-y-2">
                  {roles.map((role: Role) => {
                    const config = roleConfig[role.name] || { color: 'bg-gray-100 text-gray-700', icon: UserIcon, label: role.name };
                    const IconComponent = config.icon;
                    const isSelected = selectedRoles.includes(role.name);

                    return (
                      <button
                        key={role.id}
                        onClick={() => toggleRole(role.name)}
                        className={clsx(
                          'w-full flex items-center justify-between p-3 rounded-xl border-2 transition-all',
                          isSelected
                            ? 'border-primary-500 bg-primary-50 dark:bg-primary-500/10'
                            : 'border-neutral-200 dark:border-dark-border hover:border-neutral-300 dark:hover:border-dark-hover'
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div className={clsx('w-8 h-8 rounded-lg flex items-center justify-center', config.color)}>
                            <IconComponent className="w-4 h-4" />
                          </div>
                          <div className="text-left">
                            <div className="font-medium text-neutral-900 dark:text-white">{config.label}</div>
                            <div className="text-xs text-neutral-500">{role.users_count} utilisateur(s)</div>
                          </div>
                        </div>
                        <div className={clsx(
                          'w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all',
                          isSelected
                            ? 'border-primary-500 bg-primary-500'
                            : 'border-neutral-300 dark:border-dark-border'
                        )}>
                          {isSelected && <Check className="w-3 h-3 text-white" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowRoleModal(false)}
                  className="flex-1 px-4 py-2 border border-neutral-200 dark:border-dark-border rounded-xl hover:bg-neutral-50 dark:hover:bg-dark-hover transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={handleSaveRoles}
                  disabled={syncRolesMutation.isPending}
                  className="flex-1 px-4 py-2 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-colors disabled:opacity-50"
                >
                  {syncRolesMutation.isPending ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* User Info Modal */}
      <AnimatePresence>
        {showUserInfoModal && selectedUser && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowUserInfoModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-dark-card rounded-2xl shadow-xl max-w-md w-full p-6"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <UserIcon className="w-5 h-5 text-primary-500" />
                  Informations utilisateur
                </h3>
                <button
                  onClick={() => setShowUserInfoModal(false)}
                  className="p-2 hover:bg-neutral-100 dark:hover:bg-dark-hover rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* User Avatar & Name */}
              <div className="flex items-center gap-4 mb-6 p-4 bg-neutral-50 dark:bg-dark-hover rounded-xl">
                <div className="w-16 h-16 bg-gradient-to-br from-primary-100 to-primary-200 dark:from-primary-500/20 dark:to-primary-500/10 rounded-2xl flex items-center justify-center">
                  <span className="text-primary-600 dark:text-primary-400 font-bold text-2xl">
                    {selectedUser.nom_complet.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-lg text-neutral-900 dark:text-white">
                    {selectedUser.nom_complet}
                  </h4>
                  <p className="text-sm text-neutral-500">{selectedUser.type_compte}</p>
                  {selectedUser.badge && (
                    <span className={clsx(
                      'inline-block mt-1 text-xs px-2 py-0.5 rounded-full font-medium',
                      selectedUser.badge === 'DIAMANT' && 'bg-purple-100 text-purple-700',
                      selectedUser.badge === 'OR' && 'bg-yellow-100 text-yellow-700',
                      selectedUser.badge === 'ARGENT' && 'bg-gray-100 text-gray-700',
                      selectedUser.badge === 'BRONZE' && 'bg-orange-100 text-orange-700',
                    )}>
                      {selectedUser.badge}
                    </span>
                  )}
                </div>
              </div>

              {/* Status Badges */}
              <div className="flex flex-wrap gap-2 mb-6">
                <span className={clsx(
                  'px-3 py-1.5 text-sm font-medium rounded-full flex items-center gap-1.5',
                  getUserStatus(selectedUser).color
                )}>
                  {getUserStatus(selectedUser).label === 'Actif' && <UserCheck className="w-4 h-4" />}
                  {getUserStatus(selectedUser).label === 'Inactif' && <UserX className="w-4 h-4" />}
                  {getUserStatus(selectedUser).label === 'Suspendu' && <Ban className="w-4 h-4" />}
                  {getUserStatus(selectedUser).label === 'Banni' && <Ban className="w-4 h-4" />}
                  {getUserStatus(selectedUser).label}
                </span>
                <span className={clsx(
                  'px-3 py-1.5 text-sm font-medium rounded-full',
                  getStatusColor(selectedUser.statut_verification)
                )}>
                  {selectedUser.statut_verification.replace(/_/g, ' ')}
                </span>
              </div>

              {/* Contact Info */}
              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-8 h-8 bg-blue-100 dark:bg-blue-500/20 rounded-lg flex items-center justify-center">
                    <Phone className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-neutral-500 text-xs">Telephone</p>
                    <p className="font-medium text-neutral-900 dark:text-white">{selectedUser.telephone}</p>
                  </div>
                </div>

                {selectedUser.email && (
                  <div className="flex items-center gap-3 text-sm">
                    <div className="w-8 h-8 bg-purple-100 dark:bg-purple-500/20 rounded-lg flex items-center justify-center">
                      <Mail className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <p className="text-neutral-500 text-xs">Email</p>
                      <p className="font-medium text-neutral-900 dark:text-white">{selectedUser.email}</p>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3 text-sm">
                  <div className="w-8 h-8 bg-green-100 dark:bg-green-500/20 rounded-lg flex items-center justify-center">
                    <Calendar className="w-4 h-4 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="text-neutral-500 text-xs">Date d'inscription</p>
                    <p className="font-medium text-neutral-900 dark:text-white">
                      {new Date(selectedUser.created_at).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric'
                      })}
                    </p>
                  </div>
                </div>
              </div>

              {/* Roles */}
              {selectedUser.roles && selectedUser.roles.length > 0 && (
                <div className="mb-6">
                  <p className="text-xs text-neutral-500 mb-2">Roles attribues</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedUser.roles.map((role) => {
                      const config = roleConfig[role] || { color: 'bg-gray-100 text-gray-700', icon: UserIcon, label: role };
                      const IconComponent = config.icon;
                      return (
                        <span
                          key={role}
                          className={clsx('text-sm px-3 py-1.5 rounded-full font-medium flex items-center gap-1.5', config.color)}
                        >
                          <IconComponent className="w-3.5 h-3.5" />
                          {config.label}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="space-y-3 pt-4 border-t border-neutral-100 dark:border-dark-border">
                <p className="text-xs text-neutral-500 font-medium">Actions disponibles</p>

                <div className="grid grid-cols-2 gap-2">
                  {/* Gérer les rôles */}
                  <button
                    onClick={() => {
                      setShowUserInfoModal(false);
                      openRoleModal(selectedUser);
                    }}
                    className="px-3 py-2.5 bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400 rounded-xl hover:bg-primary-100 dark:hover:bg-primary-500/20 transition-colors font-medium flex items-center justify-center gap-2 text-sm"
                  >
                    <Shield className="w-4 h-4" />
                    Roles
                  </button>

                  {/* Suspendre / Lever suspension */}
                  <button
                    onClick={() => userActionMutation.mutate({
                      userId: selectedUser.id,
                      action: selectedUser.is_suspended ? 'unsuspend' : 'suspend'
                    })}
                    disabled={userActionMutation.isPending}
                    className={clsx(
                      'px-3 py-2.5 rounded-xl transition-colors font-medium flex items-center justify-center gap-2 text-sm',
                      selectedUser.is_suspended
                        ? 'bg-green-500 hover:bg-green-600 text-white'
                        : 'bg-orange-500 hover:bg-orange-600 text-white'
                    )}
                  >
                    {userActionMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : selectedUser.is_suspended ? (
                      <>
                        <UserCheck className="w-4 h-4" />
                        Lever susp.
                      </>
                    ) : (
                      <>
                        <Ban className="w-4 h-4" />
                        Suspendre
                      </>
                    )}
                  </button>

                  {/* Activer / Désactiver */}
                  <button
                    onClick={() => userActionMutation.mutate({
                      userId: selectedUser.id,
                      action: selectedUser.is_active ? 'deactivate' : 'activate'
                    })}
                    disabled={userActionMutation.isPending}
                    className={clsx(
                      'px-3 py-2.5 rounded-xl transition-colors font-medium flex items-center justify-center gap-2 text-sm',
                      selectedUser.is_active
                        ? 'bg-gray-500 hover:bg-gray-600 text-white'
                        : 'bg-success-500 hover:bg-success-600 text-white'
                    )}
                  >
                    {userActionMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : selectedUser.is_active ? (
                      <>
                        <UserX className="w-4 h-4" />
                        Desactiver
                      </>
                    ) : (
                      <>
                        <UserCheck className="w-4 h-4" />
                        Activer
                      </>
                    )}
                  </button>

                  {/* Bannir (action severe) */}
                  {!selectedUser.is_suspended && selectedUser.is_active && (
                    <button
                      onClick={() => {
                        if (confirm('Voulez-vous vraiment bannir cet utilisateur ? Cette action est severe.')) {
                          userActionMutation.mutate({
                            userId: selectedUser.id,
                            action: 'ban'
                          });
                        }
                      }}
                      disabled={userActionMutation.isPending}
                      className="px-3 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl transition-colors font-medium flex items-center justify-center gap-2 text-sm"
                    >
                      {userActionMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <Ban className="w-4 h-4" />
                          Bannir
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { COLORS } from '../constants/config';
import { RootStackParamList } from '../types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const PublishScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();

  const handlePublish = (type: 'VENTE' | 'LOCATION') => {
    navigation.navigate('EditListing', { id: undefined });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Publier une annonce</Text>
          <Text style={styles.headerSubtitle}>
            Choisissez le type d'annonce que vous souhaitez publier
          </Text>
        </View>

        <View style={styles.cards}>
          {/* Sale Card */}
          <TouchableOpacity
            style={styles.card}
            onPress={() => handlePublish('VENTE')}
            activeOpacity={0.8}
          >
            <View style={styles.cardIconContainer}>
              <Text style={styles.cardIcon}>🏷️</Text>
            </View>
            <Text style={styles.cardTitle}>Vente</Text>
            <Text style={styles.cardDescription}>
              Vendez votre bien immobilier : maison, appartement, terrain...
            </Text>
            <View style={styles.cardArrow}>
              <Text style={styles.arrowText}>→</Text>
            </View>
          </TouchableOpacity>

          {/* Rental Card */}
          <TouchableOpacity
            style={styles.card}
            onPress={() => handlePublish('LOCATION')}
            activeOpacity={0.8}
          >
            <View style={[styles.cardIconContainer, styles.rentalIcon]}>
              <Text style={styles.cardIcon}>🔑</Text>
            </View>
            <Text style={styles.cardTitle}>Location</Text>
            <Text style={styles.cardDescription}>
              Mettez en location votre bien : appartement, bureau, magasin...
            </Text>
            <View style={styles.cardArrow}>
              <Text style={styles.arrowText}>→</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Tips */}
        <View style={styles.tips}>
          <Text style={styles.tipsTitle}>💡 Conseils pour une bonne annonce</Text>
          <View style={styles.tipItem}>
            <Text style={styles.tipBullet}>•</Text>
            <Text style={styles.tipText}>
              Ajoutez des photos de qualité de votre bien
            </Text>
          </View>
          <View style={styles.tipItem}>
            <Text style={styles.tipBullet}>•</Text>
            <Text style={styles.tipText}>
              Décrivez précisément les caractéristiques
            </Text>
          </View>
          <View style={styles.tipItem}>
            <Text style={styles.tipBullet}>•</Text>
            <Text style={styles.tipText}>
              Indiquez un prix réaliste pour le marché
            </Text>
          </View>
          <View style={styles.tipItem}>
            <Text style={styles.tipBullet}>•</Text>
            <Text style={styles.tipText}>
              Mentionnez l'adresse exacte ou le quartier
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.gray[50],
  },
  content: {
    padding: 16,
  },
  header: {
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.gray[900],
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 15,
    color: COLORS.gray[500],
    lineHeight: 22,
  },
  cards: {
    gap: 16,
    marginBottom: 32,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: COLORS.primary[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  rentalIcon: {
    backgroundColor: COLORS.info + '20',
  },
  cardIcon: {
    fontSize: 28,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.gray[900],
    marginBottom: 8,
  },
  cardDescription: {
    fontSize: 14,
    color: COLORS.gray[500],
    lineHeight: 20,
    marginBottom: 12,
  },
  cardArrow: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.gray[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowText: {
    fontSize: 18,
    color: COLORS.gray[600],
  },
  tips: {
    backgroundColor: COLORS.primary[50],
    borderRadius: 12,
    padding: 16,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.gray[900],
    marginBottom: 12,
  },
  tipItem: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  tipBullet: {
    color: COLORS.primary[500],
    fontSize: 16,
    marginRight: 8,
    lineHeight: 20,
  },
  tipText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.gray[700],
    lineHeight: 20,
  },
});

export default PublishScreen;

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { ContractCard, Contract } from '@/components/contracts/ContractCard';

const mockContract: Contract = {
  id: '1',
  numero_contrat: 'CTR-2024-001',
  type_contrat: 'LOCATION',
  statut: 'ACTIF',
  date_debut: '2024-01-01',
  date_fin: '2024-12-31',
  montant_loyer: 500000,
  bailleur_id: 'user-1',
  locataire_id: 'user-2',
  listing: {
    id: 'listing-1',
    titre: 'Appartement 3 pièces',
    quartier: 'Kaloum',
    commune: 'Conakry',
    main_photo_url: 'https://example.com/photo.jpg',
  },
  proprietaire: {
    id: 'user-1',
    nom_complet: 'Jean Dupont',
  },
  locataire: {
    id: 'user-2',
    nom_complet: 'Marie Martin',
  },
};

const defaultProps = {
  contract: mockContract,
  userId: 'user-1',
  isDownloading: false,
  onPress: jest.fn(),
  onViewDetails: jest.fn(),
  onDownload: jest.fn(),
  onSign: jest.fn(),
};

describe('ContractCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders contract number', () => {
    render(<ContractCard {...defaultProps} />);

    expect(screen.getByText('CTR-2024-001')).toBeTruthy();
  });

  it('renders property information', () => {
    render(<ContractCard {...defaultProps} />);

    expect(screen.getByText('Appartement 3 pièces')).toBeTruthy();
    expect(screen.getByText('Kaloum, Conakry')).toBeTruthy();
  });

  it('calls onPress when card is pressed', () => {
    render(<ContractCard {...defaultProps} />);

    const card = screen.getByText('CTR-2024-001').parent?.parent;
    if (card) {
      fireEvent.press(card);
      expect(defaultProps.onPress).toHaveBeenCalled();
    }
  });

  it('calls onViewDetails when details button is pressed', () => {
    render(<ContractCard {...defaultProps} />);

    const detailsButton = screen.getByText('contracts.viewDetails');
    fireEvent.press(detailsButton);

    expect(defaultProps.onViewDetails).toHaveBeenCalled();
  });

  it('calls onDownload when download button is pressed', () => {
    render(<ContractCard {...defaultProps} />);

    const downloadButton = screen.getByText('contracts.download');
    fireEvent.press(downloadButton);

    expect(defaultProps.onDownload).toHaveBeenCalled();
  });

  it('shows downloading state', () => {
    render(<ContractCard {...defaultProps} isDownloading={true} />);

    expect(screen.getByText('contracts.downloading')).toBeTruthy();
  });

  it('shows sign button when user needs to sign', () => {
    const contractNeedingSignature: Contract = {
      ...mockContract,
      bailleur_signed_at: undefined,
    };

    render(<ContractCard {...defaultProps} contract={contractNeedingSignature} />);

    expect(screen.getByText('contracts.signContract')).toBeTruthy();
  });

  it('shows signed badge when user has signed', () => {
    const signedContract: Contract = {
      ...mockContract,
      bailleur_signed_at: '2024-01-15T10:00:00Z',
    };

    render(<ContractCard {...defaultProps} contract={signedContract} />);

    expect(screen.getByText('contracts.youSignedContract')).toBeTruthy();
  });

  it('displays correct status for different statuses', () => {
    const pendingContract: Contract = {
      ...mockContract,
      statut: 'EN_ATTENTE',
    };

    render(<ContractCard {...defaultProps} contract={pendingContract} />);

    expect(screen.getByText('contracts.status.EN_ATTENTE')).toBeTruthy();
  });
});

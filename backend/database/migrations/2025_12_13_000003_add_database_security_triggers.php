<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Adds PostgreSQL triggers to prevent unauthorized deletion/modification
     * of critical data (contracts, integrity audits)
     */
    public function up(): void
    {
        // Create function to prevent deletion of locked contracts
        DB::unprepared("
            CREATE OR REPLACE FUNCTION prevent_locked_contract_deletion()
            RETURNS TRIGGER AS \$\$
            BEGIN
                IF OLD.is_locked = true THEN
                    RAISE EXCEPTION 'Cannot delete locked contract (ID: %). Contracts are protected for 10 years.', OLD.id;
                END IF;
                RETURN OLD;
            END;
            \$\$ LANGUAGE plpgsql;
        ");

        // Create trigger on contracts table
        DB::unprepared("
            DROP TRIGGER IF EXISTS protect_locked_contracts ON contracts;
            CREATE TRIGGER protect_locked_contracts
                BEFORE DELETE ON contracts
                FOR EACH ROW
                EXECUTE FUNCTION prevent_locked_contract_deletion();
        ");

        // Create function to prevent modification of locked contracts
        DB::unprepared("
            CREATE OR REPLACE FUNCTION prevent_locked_contract_modification()
            RETURNS TRIGGER AS \$\$
            DECLARE
                allowed_fields TEXT[] := ARRAY['historique_telechargements', 'is_archived', 'archived_at', 'updated_at'];
                changed_fields TEXT[];
                field TEXT;
            BEGIN
                IF OLD.is_locked = true THEN
                    -- Check which fields have changed
                    IF (OLD.pdf_url IS DISTINCT FROM NEW.pdf_url) OR
                       (OLD.pdf_hash IS DISTINCT FROM NEW.pdf_hash) OR
                       (OLD.bailleur_signature_data IS DISTINCT FROM NEW.bailleur_signature_data) OR
                       (OLD.locataire_signature_data IS DISTINCT FROM NEW.locataire_signature_data) OR
                       (OLD.cachet_electronique IS DISTINCT FROM NEW.cachet_electronique) OR
                       (OLD.loyer_mensuel IS DISTINCT FROM NEW.loyer_mensuel) OR
                       (OLD.caution IS DISTINCT FROM NEW.caution) OR
                       (OLD.date_debut IS DISTINCT FROM NEW.date_debut) OR
                       (OLD.date_fin IS DISTINCT FROM NEW.date_fin) THEN
                        RAISE EXCEPTION 'Cannot modify critical fields on locked contract (ID: %).', OLD.id;
                    END IF;
                END IF;
                RETURN NEW;
            END;
            \$\$ LANGUAGE plpgsql;
        ");

        // Create trigger for modifications
        DB::unprepared("
            DROP TRIGGER IF EXISTS protect_locked_contracts_update ON contracts;
            CREATE TRIGGER protect_locked_contracts_update
                BEFORE UPDATE ON contracts
                FOR EACH ROW
                EXECUTE FUNCTION prevent_locked_contract_modification();
        ");

        // Create function to prevent deletion of integrity audit records
        DB::unprepared("
            CREATE OR REPLACE FUNCTION prevent_audit_deletion()
            RETURNS TRIGGER AS \$\$
            BEGIN
                IF OLD.retention_until > NOW() THEN
                    RAISE EXCEPTION 'Cannot delete integrity audit record (ID: %) before retention period expires (%).', OLD.id, OLD.retention_until;
                END IF;
                RETURN OLD;
            END;
            \$\$ LANGUAGE plpgsql;
        ");

        // Create trigger on integrity_audits table
        DB::unprepared("
            DROP TRIGGER IF EXISTS protect_integrity_audits ON integrity_audits;
            CREATE TRIGGER protect_integrity_audits
                BEFORE DELETE ON integrity_audits
                FOR EACH ROW
                EXECUTE FUNCTION prevent_audit_deletion();
        ");

        // Create function to prevent modification of integrity audit hashes
        DB::unprepared("
            CREATE OR REPLACE FUNCTION prevent_audit_hash_modification()
            RETURNS TRIGGER AS \$\$
            BEGIN
                IF (OLD.original_hash IS DISTINCT FROM NEW.original_hash) OR
                   (OLD.encrypted_hash IS DISTINCT FROM NEW.encrypted_hash) OR
                   (OLD.file_path IS DISTINCT FROM NEW.file_path) THEN
                    RAISE EXCEPTION 'Cannot modify hash or file path on integrity audit record (ID: %).', OLD.id;
                END IF;
                RETURN NEW;
            END;
            \$\$ LANGUAGE plpgsql;
        ");

        // Create trigger for audit modifications
        DB::unprepared("
            DROP TRIGGER IF EXISTS protect_audit_hashes ON integrity_audits;
            CREATE TRIGGER protect_audit_hashes
                BEFORE UPDATE ON integrity_audits
                FOR EACH ROW
                EXECUTE FUNCTION prevent_audit_hash_modification();
        ");

        // Create audit log table for tracking all changes
        DB::unprepared("
            CREATE TABLE IF NOT EXISTS security_audit_log (
                id SERIAL PRIMARY KEY,
                table_name VARCHAR(100) NOT NULL,
                record_id UUID,
                action VARCHAR(20) NOT NULL,
                old_data JSONB,
                new_data JSONB,
                user_id UUID,
                ip_address VARCHAR(45),
                user_agent TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT check_action CHECK (action IN ('INSERT', 'UPDATE', 'DELETE'))
            );

            CREATE INDEX IF NOT EXISTS idx_security_audit_table ON security_audit_log(table_name);
            CREATE INDEX IF NOT EXISTS idx_security_audit_record ON security_audit_log(record_id);
            CREATE INDEX IF NOT EXISTS idx_security_audit_created ON security_audit_log(created_at);
        ");

        // Create audit logging function for contracts
        DB::unprepared("
            CREATE OR REPLACE FUNCTION log_contract_changes()
            RETURNS TRIGGER AS \$\$
            BEGIN
                IF TG_OP = 'DELETE' THEN
                    INSERT INTO security_audit_log (table_name, record_id, action, old_data)
                    VALUES ('contracts', OLD.id, 'DELETE', row_to_json(OLD)::jsonb);
                    RETURN OLD;
                ELSIF TG_OP = 'UPDATE' THEN
                    INSERT INTO security_audit_log (table_name, record_id, action, old_data, new_data)
                    VALUES ('contracts', OLD.id, 'UPDATE', row_to_json(OLD)::jsonb, row_to_json(NEW)::jsonb);
                    RETURN NEW;
                ELSIF TG_OP = 'INSERT' THEN
                    INSERT INTO security_audit_log (table_name, record_id, action, new_data)
                    VALUES ('contracts', NEW.id, 'INSERT', row_to_json(NEW)::jsonb);
                    RETURN NEW;
                END IF;
                RETURN NULL;
            END;
            \$\$ LANGUAGE plpgsql;
        ");

        // Create audit trigger for contracts
        DB::unprepared("
            DROP TRIGGER IF EXISTS audit_contract_changes ON contracts;
            CREATE TRIGGER audit_contract_changes
                AFTER INSERT OR UPDATE OR DELETE ON contracts
                FOR EACH ROW
                EXECUTE FUNCTION log_contract_changes();
        ");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::unprepared("DROP TRIGGER IF EXISTS protect_locked_contracts ON contracts;");
        DB::unprepared("DROP TRIGGER IF EXISTS protect_locked_contracts_update ON contracts;");
        DB::unprepared("DROP TRIGGER IF EXISTS protect_integrity_audits ON integrity_audits;");
        DB::unprepared("DROP TRIGGER IF EXISTS protect_audit_hashes ON integrity_audits;");
        DB::unprepared("DROP TRIGGER IF EXISTS audit_contract_changes ON contracts;");

        DB::unprepared("DROP FUNCTION IF EXISTS prevent_locked_contract_deletion();");
        DB::unprepared("DROP FUNCTION IF EXISTS prevent_locked_contract_modification();");
        DB::unprepared("DROP FUNCTION IF EXISTS prevent_audit_deletion();");
        DB::unprepared("DROP FUNCTION IF EXISTS prevent_audit_hash_modification();");
        DB::unprepared("DROP FUNCTION IF EXISTS log_contract_changes();");

        DB::unprepared("DROP TABLE IF EXISTS security_audit_log;");
    }
};

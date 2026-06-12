import type { Dispatch, SetStateAction } from 'react';
import type { AddressSelection } from '../../utils/enrollmentFormUtils';
import { buildAddressLine } from '../../utils/enrollmentFormUtils';
import { SelectField, TextField } from '../form/FormFields';
import type { PsgcLocation } from '../../services/psgcApiClient';

type Props = {
  existingPermanentAddress: string;
  existingCurrentAddress: string;
  permanentAddress: AddressSelection;
  currentAddress: AddressSelection;
  sameAsPermanent: boolean;
  setSameAsPermanent: (value: boolean) => void;
  setPermanentAddress: Dispatch<SetStateAction<AddressSelection>>;
  setCurrentAddress: Dispatch<SetStateAction<AddressSelection>>;
  regions: PsgcLocation[];
  permanentProvinces: PsgcLocation[];
  currentProvinces: PsgcLocation[];
  permanentCities: PsgcLocation[];
  currentCities: PsgcLocation[];
  permanentBarangays: PsgcLocation[];
  currentBarangays: PsgcLocation[];
};

export function VerificationAddressSection({
  existingPermanentAddress,
  existingCurrentAddress,
  permanentAddress,
  currentAddress,
  sameAsPermanent,
  setSameAsPermanent,
  setPermanentAddress,
  setCurrentAddress,
  regions,
  permanentProvinces,
  currentProvinces,
  permanentCities,
  currentCities,
  permanentBarangays,
  currentBarangays,
}: Props) {
  const permanentPreview = buildAddressLine(permanentAddress, regions, permanentProvinces, permanentCities);
  const currentPreview = buildAddressLine(currentAddress, regions, currentProvinces, currentCities);

  return (
    <section className="registrar-public-enrollment__section">
      <h3>3. Address Information</h3>
      <div className="notice-box">
        <strong>Address on file</strong>
        <span>Current address: {existingCurrentAddress || '--'} | Permanent address: {existingPermanentAddress || '--'}</span>
      </div>

      <div className="floating-field-grid">
        <SelectField
          label="Region (PSGC)"
          value={permanentAddress.regionCode}
          onChange={(value) => setPermanentAddress((current) => ({ ...current, regionCode: value, provinceCode: '', cityCode: '', barangayName: '' }))}
          options={regions.map((row) => ({ value: row.code, label: row.name }))}
        />
        <SelectField
          label="Province (PSGC)"
          value={permanentAddress.provinceCode}
          onChange={(value) => setPermanentAddress((current) => ({ ...current, provinceCode: value, cityCode: '', barangayName: '' }))}
          options={permanentProvinces.map((row) => ({ value: row.code, label: row.name }))}
          disabled={!permanentAddress.regionCode}
        />
        <SelectField
          label="City / Municipality (PSGC)"
          value={permanentAddress.cityCode}
          onChange={(value) => setPermanentAddress((current) => ({ ...current, cityCode: value, barangayName: '' }))}
          options={permanentCities.map((row) => ({ value: row.code, label: row.name }))}
          disabled={!permanentAddress.regionCode || (!permanentAddress.provinceCode && permanentProvinces.length > 0)}
        />
        <SelectField
          label="Barangay"
          value={permanentAddress.barangayName}
          onChange={(value) => setPermanentAddress((current) => ({ ...current, barangayName: value }))}
          options={permanentBarangays.map((row) => ({ value: row.name, label: row.name }))}
          disabled={!permanentAddress.cityCode}
        />
        <TextField
          label="Street / Barangay / Purok"
          value={permanentAddress.streetLine}
          onChange={(value) => setPermanentAddress((current) => ({ ...current, streetLine: value }))}
        />
      </div>

      <div className="notice-box" style={{ marginTop: 12 }}>
        <strong>Permanent address preview</strong>
        <span>{permanentPreview || existingPermanentAddress || '--'}</span>
      </div>

      <label className="choice-row registrar-public-enrollment__same-address enrollment-public-enrollment__choice-box">
        <input type="checkbox" checked={sameAsPermanent} onChange={(event) => setSameAsPermanent(event.target.checked)} />
        <span>Current address is same as permanent address.</span>
      </label>

      <div className="notice-box">
        <strong>Current address builder</strong>
        <span>Use PSGC fields to rewrite the current address.</span>
      </div>

      <div className="floating-field-grid">
        <SelectField
          label="Region (PSGC)"
          value={currentAddress.regionCode}
          onChange={(value) => setCurrentAddress((current) => ({ ...current, regionCode: value, provinceCode: '', cityCode: '', barangayName: '' }))}
          options={regions.map((row) => ({ value: row.code, label: row.name }))}
          disabled={sameAsPermanent}
        />
        <SelectField
          label="Province (PSGC)"
          value={currentAddress.provinceCode}
          onChange={(value) => setCurrentAddress((current) => ({ ...current, provinceCode: value, cityCode: '', barangayName: '' }))}
          options={currentProvinces.map((row) => ({ value: row.code, label: row.name }))}
          disabled={sameAsPermanent || !currentAddress.regionCode}
        />
        <SelectField
          label="City / Municipality (PSGC)"
          value={currentAddress.cityCode}
          onChange={(value) => setCurrentAddress((current) => ({ ...current, cityCode: value, barangayName: '' }))}
          options={currentCities.map((row) => ({ value: row.code, label: row.name }))}
          disabled={sameAsPermanent || !currentAddress.regionCode || (!currentAddress.provinceCode && currentProvinces.length > 0)}
        />
        <SelectField
          label="Barangay"
          value={currentAddress.barangayName}
          onChange={(value) => setCurrentAddress((current) => ({ ...current, barangayName: value }))}
          options={currentBarangays.map((row) => ({ value: row.name, label: row.name }))}
          disabled={sameAsPermanent || !currentAddress.cityCode}
        />
        <TextField
          label="Street / Barangay / Purok"
          value={currentAddress.streetLine}
          onChange={(value) => setCurrentAddress((current) => ({ ...current, streetLine: value }))}
          disabled={sameAsPermanent}
        />
      </div>

      <div className="notice-box" style={{ marginTop: 12 }}>
        <strong>Current address preview</strong>
        <span>{sameAsPermanent ? permanentPreview || existingPermanentAddress || '--' : currentPreview || existingCurrentAddress || '--'}</span>
      </div>
    </section>
  );
}

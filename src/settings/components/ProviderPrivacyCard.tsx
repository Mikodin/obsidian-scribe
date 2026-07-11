import type { ProviderMetadata } from 'src/aiProviders/providerMetadata';

const TRAINS_ON_DATA_LABELS: Record<string, string> = {
  yes: 'Yes',
  no: 'No',
  'opt-out': 'Yes, unless you opt out',
};

export function ProviderPrivacyCard({
  metadata,
}: {
  metadata: ProviderMetadata;
}) {
  const { privacy, displayName, keyConsoleUrl } = metadata;

  return (
    <div className="scribe-provider-privacy-card">
      <div className="scribe-provider-privacy-title">
        {displayName} — data & privacy
      </div>
      {privacy ? (
        <ul className="scribe-provider-privacy-facts">
          <li>Data retention: {privacy.retentionSummary}</li>
          <li>
            Trains on your API data:{' '}
            {TRAINS_ON_DATA_LABELS[privacy.trainsOnApiData]}
          </li>
          <li>
            <a href={privacy.policyUrl}>Privacy policy</a>
            {' · '}
            <a href={keyConsoleUrl}>API key console</a>
          </li>
        </ul>
      ) : (
        <div className="scribe-provider-privacy-facts">
          Privacy depends on the endpoint you configure — data goes wherever
          your base URL points.
        </div>
      )}
      <div className="scribe-provider-privacy-disclaimer">
        Summary only — check the provider's policy for current terms.
      </div>
    </div>
  );
}

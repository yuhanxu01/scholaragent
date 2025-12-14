import { useGlobalDictionary } from '../../hooks/useGlobalDictionary';

export const GlobalDictionaryProvider: React.FC = () => {
  const { SelectionToolbarComponent } = useGlobalDictionary();

  return <>{SelectionToolbarComponent}</>;
};
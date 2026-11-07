import { PartLibraryScreen } from '@/features/part-library/PartLibraryScreen';
import { hasLibraryAccess } from '@/features/part-library/server/libraryAccess';
import { readLibrary } from '@/features/part-library/server/libraryStore';

export default async function PartLibraryPage() {
  const isUnlocked = await hasLibraryAccess();
  return <PartLibraryScreen key={String(isUnlocked)} isUnlocked={isUnlocked} initialParts={isUnlocked ? await readLibrary() : []} />;
}

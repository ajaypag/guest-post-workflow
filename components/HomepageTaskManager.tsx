'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import TasksPageClient from '@/app/internal/tasks/TasksPageClient';
import type { TasksResponse } from '@/lib/types/tasks';

interface InternalUser {
  id: string;
  name: string | null;
  email: string;
  taskCount: number;
  activeTaskCount: number;
}

interface HomepageTaskManagerProps {
  initialData: TasksResponse;
  currentUserId: string;
  currentUserName: string;
  currentUserEmail: string;
  internalUsers: InternalUser[];
}

export default function HomepageTaskManager({
  initialData,
  currentUserId,
  currentUserName,
  currentUserEmail,
  internalUsers
}: HomepageTaskManagerProps) {
  // Wrap the TasksPageClient with any homepage-specific modifications if needed
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <TasksPageClient
        initialData={initialData}
        currentUserId={currentUserId}
        currentUserName={currentUserName}
        currentUserEmail={currentUserEmail}
        internalUsers={internalUsers}
      />
    </div>
  );
}
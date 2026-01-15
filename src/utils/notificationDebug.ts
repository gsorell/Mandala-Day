import * as Notifications from 'expo-notifications';
import { format } from 'date-fns';

/**
 * Debug utility to check notification scheduling status
 */
export const debugNotifications = async () => {
  console.log('=== NOTIFICATION DEBUG ===');
  
  // Check permissions
  const { status } = await Notifications.getPermissionsAsync();
  console.log('Permission status:', status);
  
  // Get all scheduled notifications
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  console.log('\nScheduled notifications count:', scheduled.length);
  
  if (scheduled.length > 0) {
    console.log('\nScheduled notifications:');
    scheduled.forEach((notification, index) => {
      const trigger = notification.trigger as any;
      const date = trigger.type === 'date' ? new Date(trigger.value) : null;
      
      console.log(`\n${index + 1}. ${notification.content.title}`);
      console.log('   Body:', notification.content.body);
      console.log('   ID:', notification.identifier);
      if (date) {
        console.log('   Scheduled for:', format(date, 'yyyy-MM-dd HH:mm:ss'));
        console.log('   Time until trigger:', Math.round((date.getTime() - Date.now()) / 1000 / 60), 'minutes');
      }
      console.log('   Data:', notification.content.data);
    });
  } else {
    console.log('\nNo notifications are currently scheduled!');
    console.log('This could mean:');
    console.log('- Notifications were not scheduled properly');
    console.log('- All scheduled times are in the past');
    console.log('- Quiet hours prevented scheduling');
  }
  
  console.log('\n=== END DEBUG ===\n');
  
  return {
    permissionStatus: status,
    scheduledCount: scheduled.length,
    notifications: scheduled,
  };
};

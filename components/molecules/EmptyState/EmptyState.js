import styles from './EmptyState.module.css';
import { cx } from '@/lib/cx';
import Icon from '../../atoms/Icon/Icon';

export default function EmptyState({ icon = 'package', title, description, action, className }) {
  return (
    <div className={cx(styles.empty, className)}>
      <div className={styles.iconWrap}>
        <Icon name={icon} size={30} />
      </div>
      {title && <h3 className={styles.title}>{title}</h3>}
      {description && <p className={styles.desc}>{description}</p>}
      {action && <div className={styles.action}>{action}</div>}
    </div>
  );
}

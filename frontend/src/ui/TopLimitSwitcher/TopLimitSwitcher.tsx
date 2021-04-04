import React, { ReactElement } from 'react'
import styles from "./TopLimitSwitcher.module.css";

interface Props {
    currentLimit: number
    changeLimit: (limit: number) => void;
    nouns?: string;
}

/**
 * Renders a dropdown for switching some chart to a different limit of top N things (i.e. display top N protocols)
 */
export default function TopLimitSwitcher({ currentLimit, changeLimit, nouns }: Props): ReactElement {
    const handleLimitChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        let newLimit = parseInt(event.target.value);
        if (changeLimit) {
            changeLimit(newLimit);
        }
    };

    return (
        <div className={styles.wrapper}>
            Show top <select
                onChange={handleLimitChange}
                value={currentLimit}>
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={15}>15</option>
                <option value={20}>20</option>
                <option value={30}>30</option>
            </select> {nouns ? nouns : 'values'}
        </div>
    )
}

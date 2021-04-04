import React, { Component } from 'react';
import styles from './Settings.module.css';
import * as d3 from 'd3';
// @ts-ignore
import Modal, { closeStyle } from 'simple-react-modal';
import { FiSettings } from 'react-icons/fi'
const Mousetrap = require("mousetrap");

interface SettingsProps {
    settings: Settings,
    setSettings: (settings: Settings) => void,
}

interface SettingsState {
    modalOpen: boolean,
}

export interface Settings {
    resetFiltersOnNewDataset: boolean,
    clearLayersOnNewDataset: boolean
    ignoreTimeOnFiltersImport: boolean,
    displayPiecharts: boolean,
    chartsOnlyZoomableAfterClick: boolean,
}

export const defaultSettings: Settings = {
    ignoreTimeOnFiltersImport: true,
    resetFiltersOnNewDataset: true,
    clearLayersOnNewDataset: true,
    displayPiecharts: false,
    chartsOnlyZoomableAfterClick: false,
}

type SettingString = 'resetFiltersOnNewDataset' | 'ignoreTimeOnFiltersImport' | 'displayPiecharts' | 'clearLayersOnNewDataset' | 'chartsOnlyZoomableAfterClick';

/**
 *  Component that handles opening a Settings modal where user can toggle dashboard preferences and default behaviors
 */
export default class SettingsModal extends Component<SettingsProps, SettingsState> {
    constructor(props: SettingsProps) {
        super(props);
        this.state = {
            modalOpen: false,
        }
    }

    closeModal = () => {
        this.setState(() => ({
            modalOpen: false
        }));
        Mousetrap.unbind("esc");
        Mousetrap.unbind("enter");
        d3.select('body').style('overflow', 'visible');
    };

    openModal = () => {
        this.setState(() => ({
            modalOpen: true
        }));
        Mousetrap.bind("esc", this.closeModal);
        // Mousetrap.bind("enter", this.saveLayers);
        d3.select('body').style('overflow', 'hidden');
    }

    changeSetting = (setting: SettingString, value: boolean) => {
        let newSettings = { ...this.props.settings };
        newSettings[setting] = value;
        this.props.setSettings(newSettings);
    }

    settingToggle = (setting: SettingString, description: string) => (
        <p className={styles.settingsLine}>
            <input
                type='checkbox'
                onChange={(event) => this.changeSetting(setting, event.target.checked)}
                checked={this.props.settings[setting]} />
            {description}
        </p>
    )

    render() {
        return (
            <React.Fragment>
                <FiSettings className={styles.gearIcon} onClick={this.openModal} title="Change dashboard preferences and default behaviors" />
                <Modal
                    show={this.state.modalOpen}
                    style={{ zIndex: '1000' }}
                    containerClassName={styles.settingsModalContainer}
                    onClose={this.closeModal}>
                        <span style={closeStyle} onClick={this.closeModal}>X</span>
                        <h2>Settings</h2>

                    <div className={styles.settingsBox}>
                        {this.settingToggle('resetFiltersOnNewDataset', 'Clear filter values when loading a new dataset')}
                        {this.settingToggle('clearLayersOnNewDataset', 'Clear filtration layers on new dataset')}
                        {this.settingToggle('ignoreTimeOnFiltersImport', 'Ignore time selection when importing filters')}
                        {this.settingToggle('displayPiecharts', 'Display piecharts in filtration layers')}
                        {this.settingToggle('chartsOnlyZoomableAfterClick', 'Maps are zoomable only after clicking on them')}

                    </div>
                        <p>
                            <button onClick={this.closeModal}>Save and close</button>
                        </p>
                </Modal>
            </React.Fragment>
        )
    }
}

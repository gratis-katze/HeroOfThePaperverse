import Phaser from 'phaser'
import { UnitConfig, DEFAULT_UNIT_CONFIG, AVAILABLE_TEXTURES, TextureOption, AttackType } from '../../units/UnitConfig'
import { deepCloneUnitConfig } from '../../utils/ConfigUtils'

export class UnitConfigModal {
  private static instance: UnitConfigModal | null = null
  private static sceneKey: string | null = null
  
  private scene: Phaser.Scene
  private uiCamera: Phaser.Cameras.Scene2D.Camera
  private modal!: Phaser.GameObjects.Container
  private overlay!: Phaser.GameObjects.Rectangle
  private inputTexts: Map<string, Phaser.GameObjects.Text> = new Map()
  private selectedField: string | null = null
  private config: UnitConfig
  private onConfirm: (config: UnitConfig) => void
  private onCancel: () => void
  private visible: boolean = false
  private lastKeyTime: number = 0
  private lastKey: string = ''
  private textureDropdown: Phaser.GameObjects.Container | null = null
  private textureDropdownVisible: boolean = false
  private modifiedFields: Set<string> = new Set()
  private freshReset: boolean = false
  private sections: Map<string, { container: Phaser.GameObjects.Container, collapsed: boolean, fields: string[] }> = new Map()
  private currentSectionId: string | null = null
  private currentFieldIndex: number = 0
  private checkboxes: Map<string, Phaser.GameObjects.Text> = new Map()

  private constructor(scene: Phaser.Scene, uiCamera: Phaser.Cameras.Scene2D.Camera) {
    this.scene = scene
    this.uiCamera = uiCamera
    this.config = { 
      ...DEFAULT_UNIT_CONFIG,
      hitboxWidth: DEFAULT_UNIT_CONFIG.hitboxWidth || 1,
      hitboxHeight: DEFAULT_UNIT_CONFIG.hitboxHeight || 1,
      hitboxCenterX: DEFAULT_UNIT_CONFIG.hitboxCenterX || 0,
      hitboxCenterY: DEFAULT_UNIT_CONFIG.hitboxCenterY || 0
    }
    
    // UnitConfigModal instance created
    
    // Default callbacks
    this.onConfirm = () => {}
    this.onCancel = () => {}
    
    this.createModal()
  }
  
  public static getInstance(scene: Phaser.Scene, uiCamera: Phaser.Cameras.Scene2D.Camera): UnitConfigModal {
    const currentSceneKey = scene.scene.key
    
    // getInstance called for scene
    
    // Check if we need to update scene references for existing instance
    if (UnitConfigModal.instance && 
        (UnitConfigModal.sceneKey !== currentSceneKey || 
         UnitConfigModal.instance.scene !== scene ||
         UnitConfigModal.instance.scene.scene.key !== currentSceneKey)) {
      // Updating existing UnitConfigModal for new scene
      UnitConfigModal.instance.updateSceneReferences(scene, uiCamera)
      UnitConfigModal.sceneKey = currentSceneKey
    }
    
    // Create new instance if none exists
    if (!UnitConfigModal.instance) {
      // Creating new UnitConfigModal singleton
      UnitConfigModal.instance = new UnitConfigModal(scene, uiCamera)
      UnitConfigModal.sceneKey = currentSceneKey
    }
    
    return UnitConfigModal.instance
  }

  public show(onConfirm: (config: UnitConfig) => void, onCancel: () => void, prefillConfig?: UnitConfig): void {
    // UnitConfigModal.show() called
    console.log(`🔧 UnitConfigModal: show() called with prefillConfig:`, prefillConfig)
    
    // Check if this is a fresh reset before modifying the flag
    const wasFreshReset = this.freshReset
    
    // Use prefilled config if provided, otherwise use default logic
    if (prefillConfig) {
      // Deep clone the prefilled config to ensure no shared references
      this.config = deepCloneUnitConfig(prefillConfig)
      console.log(`🔧 UnitConfigModal: Using prefilled config, AI config:`, this.config.ai)
      // Ensure required fields have defaults
      this.config.hitboxWidth = this.config.hitboxWidth || 1
      this.config.hitboxHeight = this.config.hitboxHeight || 1
      this.config.hitboxCenterX = this.config.hitboxCenterX || 0
      this.config.hitboxCenterY = this.config.hitboxCenterY || 0
      
      this.modifiedFields.clear() // Clear modified fields when pre-filling
      // Initialized with prefilled config
    } else if (!this.config || Object.keys(this.config).length === 0 || this.freshReset) {
      // Deep clone the default config to ensure no shared references
      this.config = deepCloneUnitConfig(DEFAULT_UNIT_CONFIG)
      this.freshReset = false
      // Initialized fresh config
    } else {
      // Preserving existing config
    }
    
    this.onConfirm = onConfirm
    this.onCancel = onCancel
    
    // Don't clear modified fields unless it was a fresh reset
    if (!wasFreshReset) {
      // Preserving modified fields
    } else {
      // Fresh reset - modified fields cleared
    }
    
    this.updateInputValues()
    
    // Add extra checks for modal visibility
    if (this.modal) {
      this.modal.setVisible(true)
      // Modal visibility set to true
    } else {
      console.error('🎭 ERROR: Modal container is null!')
    }
    
    if (this.overlay) {
      this.overlay.setVisible(true)
      // Overlay visibility set to true
    } else {
      console.error('🎭 ERROR: Overlay is null!')
    }
    
    this.visible = true
    
    // UnitConfigModal shown
    
    // Remove any existing keyboard listener first to prevent duplicates
    // Setting up keyboard input
    if (this.scene.input.keyboard) {
      this.scene.input.keyboard.off('keydown', this.handleKeyDown, this)
      // Keyboard listener removed and re-registered
      this.scene.input.keyboard.on('keydown', this.handleKeyDown, this)
    } else {
      console.warn('⚠️ No keyboard input available')
    }
  }

  public hide(): void {
    // Hiding modal
    
    // Sync current selected field before hiding
    if (this.selectedField) {
      this.syncFieldToConfig(this.selectedField)
      // Synced selected field before hiding
    }
    
    this.modal.setVisible(false)
    this.overlay.setVisible(false)
    this.visible = false
    this.selectedField = null
    this.hideTextureDropdown()
    
    // Reset debounce variables
    this.lastKeyTime = 0
    this.lastKey = ''
    
    // Remove keyboard listener
    if (this.scene.input.keyboard) {
      this.scene.input.keyboard.off('keydown', this.handleKeyDown, this)
      // Keyboard listener removed
    }
    // Modal hidden successfully
  }

  public isVisible(): boolean {
    return this.visible
  }

  private createModal(): void {
    const centerX = this.scene.cameras.main.width / 2
    const centerY = this.scene.cameras.main.height / 2

    // Create semi-transparent overlay
    this.overlay = this.scene.add.rectangle(centerX, centerY, this.scene.cameras.main.width, this.scene.cameras.main.height, 0x000000, 0.7)
    this.overlay.setScrollFactor(0)
    this.overlay.setDepth(9998)
    this.overlay.setVisible(false)
    this.overlay.setInteractive()
    
    // Ensure only UI camera renders this overlay
    this.scene.cameras.main.ignore(this.overlay)
    // Make sure the UI camera can see the overlay
    if (this.uiCamera) {
      this.uiCamera.setVisible(true)
    }
    // Modal overlay assigned to UI camera only
    this.overlay.on('pointerdown', () => {
      // Overlay clicked - closing dropdowns
      this.hideTextureDropdown()
    })
    
    // Create modal container
    this.modal = this.scene.add.container(centerX, centerY)
    this.modal.setScrollFactor(0)
    this.modal.setDepth(10000)
    this.modal.setVisible(false)
    
    // Ensure only UI camera renders this modal
    this.scene.cameras.main.ignore(this.modal)
    // Make sure the UI camera can see the modal
    if (this.uiCamera) {
      this.uiCamera.setVisible(true)
    }
    // Modal container assigned to UI camera only

    // Modal background - make it taller to accommodate sections
    const modalBg = this.scene.add.rectangle(0, 0, 500, 600, 0x333333, 0.95)
    modalBg.setStrokeStyle(2, 0x666666)
    this.modal.add(modalBg)

    // Title
    const title = this.scene.add.text(0, -280, 'Unit Configuration', {
      fontSize: '18px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5)
    this.modal.add(title)

    // Create sections with consistent spacing
    let currentY = -240
    const sectionSpacing = 45 // Consistent spacing between section headers

    this.createSection('basicStats', 'Basic Stats', currentY, [
      () => this.createTextField('health', 'Health'),
      () => this.createTextField('attack', 'Attack'),
      () => this.createTextField('defense', 'Defense'),
      () => this.createTextField('attackSpeed', 'Attack Speed'),
      () => this.createTextField('movementSpeed', 'Movement Speed'),
      () => this.createTextField('attackRange', 'Attack Range')
    ])
    
    currentY += sectionSpacing
    this.createSection('rewards', 'Rewards', currentY, [
      () => this.createTextField('goldOnDeath', 'Gold on Death'),
      () => this.createTextField('expOnDeath', 'Exp on Death')
    ])
    
    currentY += sectionSpacing
    this.createSection('hitbox', 'Hitbox Configuration', currentY, [
      () => this.createTextField('hitboxWidth', 'Hitbox Width'),
      () => this.createTextField('hitboxHeight', 'Hitbox Height'),
      () => this.createTextField('hitboxCenterX', 'Hitbox Center X'),
      () => this.createTextField('hitboxCenterY', 'Hitbox Center Y')
    ])
    
    currentY += sectionSpacing
    this.createSection('appearance', 'Appearance', currentY, [
      () => this.createDropdownField('texture', 'Texture'),
      () => this.createTextField('animation', 'Animation')
    ])
    
    currentY += sectionSpacing
    this.createSection('combat', 'Combat System', currentY, [
      () => this.createAttackTypeFields()
    ])
    
    currentY += sectionSpacing
    this.createSection('ai', 'AI Behaviors', currentY, [
      () => this.createAIFields()
    ])

    // Reposition all sections to account for collapsed state
    this.repositionSections()

    // Buttons - Create as containers to ensure proper layering
    const confirmBtnContainer = this.scene.add.container(-50, 250)
    const confirmBtn = this.scene.add.rectangle(0, 0, 80, 30, 0x4CAF50)
    confirmBtn.setStrokeStyle(1, 0x45a049)
    const confirmText = this.scene.add.text(0, 0, 'Confirm', {
      fontSize: '14px',
      color: '#ffffff'
    }).setOrigin(0.5)
    
    confirmBtnContainer.add([confirmBtn, confirmText])
    confirmBtnContainer.setInteractive(new Phaser.Geom.Rectangle(-40, -15, 80, 30), Phaser.Geom.Rectangle.Contains)
    confirmBtnContainer.on('pointerdown', (_pointer: any, _localX: number, _localY: number, event: any) => {
      event.stopPropagation()
      // Confirm button clicked
      this.handleConfirm()
    })
    confirmBtnContainer.on('pointerover', () => {
      confirmBtn.setFillStyle(0x5cbf60)
    })
    confirmBtnContainer.on('pointerout', () => {
      confirmBtn.setFillStyle(0x4CAF50)
    })
    this.modal.add(confirmBtnContainer)

    const cancelBtnContainer = this.scene.add.container(50, 250)
    const cancelBtn = this.scene.add.rectangle(0, 0, 80, 30, 0xf44336)
    cancelBtn.setStrokeStyle(1, 0xe53935)
    const cancelText = this.scene.add.text(0, 0, 'Cancel', {
      fontSize: '14px',
      color: '#ffffff'
    }).setOrigin(0.5)
    
    cancelBtnContainer.add([cancelBtn, cancelText])
    cancelBtnContainer.setInteractive(new Phaser.Geom.Rectangle(-40, -15, 80, 30), Phaser.Geom.Rectangle.Contains)
    cancelBtnContainer.on('pointerdown', (_pointer: any, _localX: number, _localY: number, event: any) => {
      event.stopPropagation()
      // Cancel button clicked
      this.handleCancel()
    })
    cancelBtnContainer.on('pointerover', () => {
      cancelBtn.setFillStyle(0xf55a4e)
    })
    cancelBtnContainer.on('pointerout', () => {
      cancelBtn.setFillStyle(0xf44336)
    })
    this.modal.add(cancelBtnContainer)

    // Don't ignore DOM elements by any camera to ensure interactivity
  }

  private createSection(sectionId: string, title: string, startY: number, fieldFactories: (() => void)[]): void {
    // Section header container - center it properly
    const sectionContainer = this.scene.add.container(0, startY)
    this.modal.add(sectionContainer)

    // Section header background
    const headerBg = this.scene.add.rectangle(0, 0, 450, 25, 0x444444)
    headerBg.setStrokeStyle(1, 0x666666)
    headerBg.setInteractive({ useHandCursor: true })
    sectionContainer.add(headerBg)

    // Expand/collapse arrow - start collapsed (right arrow)
    const arrow = this.scene.add.text(-210, 0, '▶', {
      fontSize: '12px',
      color: '#ffffff'
    }).setOrigin(0.5)
    sectionContainer.add(arrow)

    // Section title - position relative to center
    const titleText = this.scene.add.text(-190, 0, title, {
      fontSize: '12px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0, 0.5)
    sectionContainer.add(titleText)

    // Content container for fields - positioned below header, start hidden since collapsed by default
    const contentContainer = this.scene.add.container(0, 25) // Position below the 25px header
    contentContainer.setVisible(false)
    sectionContainer.add(contentContainer)

    // Store section info - start collapsed by default
    const sectionInfo = {
      container: contentContainer,
      collapsed: true,
      fields: [] as string[]
    }
    this.sections.set(sectionId, sectionInfo)

    // Set current section for field creation
    this.currentSectionId = sectionId
    this.currentFieldIndex = 0

    // Create fields within the content container
    fieldFactories.forEach(factory => {
      factory()
      this.currentFieldIndex++
    })

    // Clear current section
    this.currentSectionId = null
    this.currentFieldIndex = 0

    // Toggle functionality
    headerBg.on('pointerdown', () => {
      this.toggleSection(sectionId, arrow)
    })
    
    headerBg.on('pointerover', () => {
      headerBg.setFillStyle(0x555555)
    })
    
    headerBg.on('pointerout', () => {
      headerBg.setFillStyle(0x444444)
    })

    // Section creation completed
  }

  private toggleSection(sectionId: string, arrow: Phaser.GameObjects.Text): void {
    const section = this.sections.get(sectionId)
    if (!section) return

    section.collapsed = !section.collapsed
    section.container.setVisible(!section.collapsed)
    arrow.setText(section.collapsed ? '▶' : '▼')
    
    // Section toggled
    
    // Reposition all sections below this one
    this.repositionSections()
  }

  private repositionSections(): void {
    let currentY = -240
    const headerHeight = 25 // Height of section header
    const sectionSpacing = 10 // Small gap between sections
    const sectionOrder = ['basicStats', 'rewards', 'hitbox', 'appearance', 'combat', 'ai']
    
    sectionOrder.forEach((sectionId) => {
      const section = this.sections.get(sectionId)
      if (section) {
        // Find the parent container (section container)
        const sectionContainer = section.container.parentContainer
        if (sectionContainer) {
          // Position this section at current Y
          sectionContainer.y = currentY
          
          // Calculate next Y position based on whether this section is expanded
          currentY += headerHeight // Always add header height
          
          if (!section.collapsed) {
            // Add content height if section is expanded
            const contentHeight = this.calculateSectionContentHeight(sectionId)
            currentY += contentHeight
          }
          
          currentY += sectionSpacing // Add gap between sections
        }
      }
    })
  }

  private calculateSectionContentHeight(sectionId: string): number {
    const fieldHeight = 40 // Height per field
    const baseContentPadding = 15 // Base padding for content
    
    switch (sectionId) {
      case 'basicStats':
        return 6 * fieldHeight + baseContentPadding // 6 fields
      case 'rewards':
        return 2 * fieldHeight + baseContentPadding // 2 fields
      case 'hitbox':
        return 4 * fieldHeight + baseContentPadding // 4 fields
      case 'appearance':
        return 2 * fieldHeight + baseContentPadding // 2 fields
      case 'combat':
        // Combat has title + 3 checkboxes (25px each) + padding
        return 25 + (3 * 25) + baseContentPadding // Title + 3 checkboxes
      case 'ai':
        // AI has 2 subsections with titles, checkboxes and fields
        // Wander: title + checkbox + 2 fields
        // Chase: title + checkbox + 2 fields
        const wanderHeight = 25 + 25 + (2 * 30) // title + checkbox + 2 fields
        const chaseHeight = 25 + 25 + (2 * 30) // title + checkbox + 2 fields
        return wanderHeight + chaseHeight + 45 + baseContentPadding // +45 for spacing between sections
      default:
        return 40 + baseContentPadding
    }
  }

  private createTextField(key: string, label: string): void {
    const x = 20
    const y = this.getCurrentFieldY()
    
    // Find the current section being populated
    const currentSection = this.getCurrentSection()
    if (currentSection) {
      currentSection.fields.push(key)
    }
    
    // Label - reduce width to fit better
    const labelText = this.scene.add.text(x, y - 10, label, {
      fontSize: '11px',
      color: '#ffffff',
      fixedWidth: 110
    }).setOrigin(0, 0.5)
    if (currentSection) {
      currentSection.container.add(labelText)
    }

    // Input background - adjust position and size
    const inputBg = this.scene.add.rectangle(x + 140, y, 120, 20, 0x555555)
    inputBg.setStrokeStyle(1, 0x777777)
    inputBg.setInteractive({ useHandCursor: true })
    inputBg.on('pointerdown', (_pointer: any, _localX: number, _localY: number, event: any) => {
      event.stopPropagation()
      // Input field clicked
      
      // Sync current field value to config before switching
      if (this.selectedField && this.selectedField !== key) {
        // Syncing field before switching
        this.syncFieldToConfig(this.selectedField)
      }
      
      this.selectedField = key
      // Selected field changed
      this.updateFieldAppearance()
    })
    inputBg.on('pointerover', () => {
      if (this.selectedField !== key) {
        inputBg.setStrokeStyle(2, 0xaaaaaa)
      }
    })
    inputBg.on('pointerout', () => {
      if (this.selectedField !== key) {
        inputBg.setStrokeStyle(1, 0x777777)
      }
    })
    if (currentSection) {
      currentSection.container.add(inputBg)
    }

    // Input text - positioned correctly within the input background
    const currentValue = (this.config as any)[key]
    const displayValue = currentValue !== undefined ? String(currentValue) : '0'
    const inputText = this.scene.add.text(x + 140, y, displayValue, {
      fontSize: '11px',
      color: '#ffffff',
      fixedWidth: 115
    }).setOrigin(0.5, 0.5)
    if (currentSection) {
      currentSection.container.add(inputText)
    }
    this.inputTexts.set(key, inputText)
  }

  private getCurrentSection(): { container: Phaser.GameObjects.Container, collapsed: boolean, fields: string[] } | null {
    if (!this.currentSectionId) return null
    return this.sections.get(this.currentSectionId) || null
  }

  private getCurrentFieldY(): number {
    return 15 + (this.currentFieldIndex * 40) // Start at 15 since content container is already positioned below header
  }

  private createDropdownField(key: string, label: string): void {
    const x = 20
    const y = this.getCurrentFieldY()
    
    // Find the current section being populated
    const currentSection = this.getCurrentSection()
    if (currentSection) {
      currentSection.fields.push(key)
    }
    
    // Label - reduce width to fit better
    const labelText = this.scene.add.text(x, y - 10, label, {
      fontSize: '11px',
      color: '#ffffff',
      fixedWidth: 110
    }).setOrigin(0, 0.5)
    if (currentSection) {
      currentSection.container.add(labelText)
    }

    // Dropdown button background - adjust position and size
    const dropdownBg = this.scene.add.rectangle(x + 140, y, 120, 20, 0x555555)
    dropdownBg.setStrokeStyle(1, 0x777777)
    dropdownBg.setInteractive({ useHandCursor: true })
    dropdownBg.on('pointerdown', (_pointer: any, _localX: number, _localY: number, event: any) => {
      event.stopPropagation()
      // Dropdown field clicked
      // Don't set selectedField for dropdown fields - they handle their own interaction
      if (key === 'texture') {
        this.toggleTextureDropdown(x + 140, y)
      }
    })
    dropdownBg.on('pointerover', () => {
      dropdownBg.setStrokeStyle(2, 0xaaaaaa)
    })
    dropdownBg.on('pointerout', () => {
      dropdownBg.setStrokeStyle(1, 0x777777)
    })
    if (currentSection) {
      currentSection.container.add(dropdownBg)
    }

    // Dropdown arrow
    const arrow = this.scene.add.text(x + 195, y, '▼', {
      fontSize: '10px',
      color: '#ffffff'
    }).setOrigin(0.5, 0.5)
    if (currentSection) {
      currentSection.container.add(arrow)
    }

    // Display text - show current selection
    const currentTexture = AVAILABLE_TEXTURES.find(t => t.key === this.config.texture)
    const displayText = currentTexture ? currentTexture.name : this.config.texture
    const inputText = this.scene.add.text(x + 85, y, displayText, {
      fontSize: '11px',
      color: '#ffffff',
      fixedWidth: 110
    }).setOrigin(0, 0.5)
    if (currentSection) {
      currentSection.container.add(inputText)
    }
    this.inputTexts.set(key, inputText)
  }

  private toggleTextureDropdown(x: number, y: number): void {
    if (this.textureDropdownVisible) {
      this.hideTextureDropdown()
    } else {
      this.showTextureDropdown(x, y)
    }
  }

  private showTextureDropdown(x: number, y: number): void {
    // Hide any existing dropdown first
    this.hideTextureDropdown()

    // Create dropdown container
    this.textureDropdown = this.scene.add.container(0, 0)
    this.textureDropdown.setDepth(10001) // Above modal
    this.modal.add(this.textureDropdown)

    // Create background for dropdown list
    const dropdownHeight = Math.min(AVAILABLE_TEXTURES.length * 22 + 4, 200) // Max height 200px
    const dropdownListBg = this.scene.add.rectangle(x, y + 30, 150, dropdownHeight, 0x444444, 0.95)
    dropdownListBg.setStrokeStyle(1, 0x666666)
    this.textureDropdown.add(dropdownListBg)

    // Add scroll container if needed
    let startY = y + 30 - (dropdownHeight / 2) + 12
    
    AVAILABLE_TEXTURES.forEach((textureOption, index) => {
      if (index * 22 < dropdownHeight - 20) { // Only show items that fit
        const itemY = startY + (index * 22)
        
        // Item background
        const itemBg = this.scene.add.rectangle(x, itemY, 148, 20, 0x555555)
        itemBg.setInteractive({ useHandCursor: true })
        
        // Item text
        const itemText = this.scene.add.text(x - 70, itemY, textureOption.name, {
          fontSize: '11px',
          color: '#ffffff'
        }).setOrigin(0, 0.5)
        
        // Hover effects
        itemBg.on('pointerover', () => {
          itemBg.setFillStyle(0x666666)
        })
        itemBg.on('pointerout', () => {
          itemBg.setFillStyle(0x555555)
        })
        
        // Click handler
        itemBg.on('pointerdown', (_pointer: any, _localX: number, _localY: number, event: any) => {
          event.stopPropagation()
          // Selected texture
          
          // Hide dropdown first, then update selection
          this.hideTextureDropdown()
          
          // Use setTimeout to ensure the update happens after the dropdown is hidden
          setTimeout(() => {
            this.selectTexture(textureOption)
          }, 10)
        })
        
        this.textureDropdown!.add([itemBg, itemText])
      }
    })

    this.textureDropdownVisible = true
  }

  private hideTextureDropdown(): void {
    if (this.textureDropdown) {
      this.textureDropdown.destroy()
      this.textureDropdown = null
    }
    this.textureDropdownVisible = false
  }

  private selectTexture(textureOption: TextureOption): void {
    // selectTexture called
    
    // Update config
    this.config.texture = textureOption.key
    this.config.animationPrefix = textureOption.animationPrefix
    // Config updated
    
    // Update display text
    const textureText = this.inputTexts.get('texture')
    // textureText element found
    if (textureText) {
      textureText.setText(textureOption.name)
      // Text updated
    }
    
    // Updated texture selection
  }

  private createAttackTypeFields(): void {
    const x = 20
    let y = 15 // Start at 15 since content container is positioned below header
    
    // Find the current section being populated
    const currentSection = this.getCurrentSection()
    
    // Section title
    const sectionTitle = this.scene.add.text(x, y, 'Available Attack Types:', {
      fontSize: '12px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0, 0.5)
    if (currentSection) {
      currentSection.container.add(sectionTitle)
    }

    // Create checkboxes for each attack type
    const attackTypes = [AttackType.MELEE, AttackType.RANGED, AttackType.HOMING]
    attackTypes.forEach((attackType, index) => {
      const checkboxY = y + 25 + (index * 25)
      this.createAttackTypeCheckbox(attackType, x + 20, checkboxY, currentSection)
    })
  }


  private createAttackTypeCheckbox(attackType: AttackType, x: number, y: number, section?: { container: Phaser.GameObjects.Container, collapsed: boolean, fields: string[] } | null): void {
    // Checkbox background
    const checkboxBg = this.scene.add.rectangle(x, y, 16, 16, 0x555555)
    checkboxBg.setStrokeStyle(1, 0x777777)
    checkboxBg.setInteractive({ useHandCursor: true })
    
    // Checkbox checkmark (initially based on config)
    const attackKey = attackType as keyof typeof this.config.availableAttackTypes
    const isEnabled = this.config.availableAttackTypes[attackKey].enabled
    const checkmark = this.scene.add.text(x, y, '✓', {
      fontSize: '12px',
      color: '#00ff00'
    }).setOrigin(0.5, 0.5).setVisible(isEnabled)
    
    // Store checkbox reference for easy updates
    this.checkboxes.set(`attack_${attackType}`, checkmark)
    
    // Label
    const label = this.scene.add.text(x + 25, y, attackType.toUpperCase(), {
      fontSize: '11px',
      color: '#ffffff'
    }).setOrigin(0, 0.5)

    // Click handler
    checkboxBg.on('pointerdown', () => {
      const currentlyEnabled = this.config.availableAttackTypes[attackKey].enabled
      this.config.availableAttackTypes[attackKey].enabled = !currentlyEnabled
      checkmark.setVisible(!currentlyEnabled)
      
      // If we disabled the currently active attack type, set active to first enabled
      if (!this.config.availableAttackTypes[attackKey].enabled && this.config.activeAttackType === attackType) {
        const firstEnabled = Object.keys(this.config.availableAttackTypes).find(
          key => this.config.availableAttackTypes[key as keyof typeof this.config.availableAttackTypes].enabled
        ) as AttackType
        if (firstEnabled) {
          this.config.activeAttackType = firstEnabled
        }
      }
      
      // Attack type toggled
    })

    if (section) {
      section.container.add([checkboxBg, checkmark, label])
    } else {
      this.modal.add([checkboxBg, checkmark, label])
    }
  }

  private createAIFields(): void {
    const x = 20
    let y = 15 // Start at 15 since content container is positioned below header
    
    // Find the current section being populated
    const currentSection = this.getCurrentSection()
    
    // Wander behavior section
    const wanderTitle = this.scene.add.text(x, y, 'Wander Behavior:', {
      fontSize: '12px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0, 0.5)
    if (currentSection) {
      currentSection.container.add(wanderTitle)
    }

    // Wander enabled checkbox
    const wanderY = y + 25
    this.createAICheckbox('wander_enabled', 'Enable Wander', x + 20, wanderY, currentSection)

    // Wander radius field
    const radiusY = wanderY + 25
    this.createAITextField('wander_radius', 'Wander Radius', x + 20, radiusY, currentSection)

    // Wander interval field
    const intervalY = radiusY + 30
    this.createAITextField('wander_interval', 'Wander Interval (ms)', x + 20, intervalY, currentSection)

    // Chase behavior section
    const chaseY = intervalY + 35
    const chaseTitle = this.scene.add.text(x, chaseY, 'Chase Behavior:', {
      fontSize: '12px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0, 0.5)
    if (currentSection) {
      currentSection.container.add(chaseTitle)
    }

    // Chase enabled checkbox
    const chaseEnabledY = chaseY + 25
    this.createAICheckbox('chase_enabled', 'Enable Chase', x + 20, chaseEnabledY, currentSection)

    // Chase range field
    const chaseRangeY = chaseEnabledY + 25
    this.createAITextField('chase_range', 'Chase Range', x + 20, chaseRangeY, currentSection)

    // Chase distance field
    const chaseDistanceY = chaseRangeY + 30
    this.createAITextField('chase_distance', 'Max Chase Distance', x + 20, chaseDistanceY, currentSection)

  }

  private createAICheckbox(
    key: string, 
    label: string, 
    x: number, 
    y: number, 
    section?: { container: Phaser.GameObjects.Container, collapsed: boolean, fields: string[] } | null
  ): void {
    // Checkbox background
    const checkboxBg = this.scene.add.rectangle(x, y, 16, 16, 0x555555)
    checkboxBg.setStrokeStyle(1, 0x777777)
    checkboxBg.setInteractive({ useHandCursor: true })
    
    // Checkbox checkmark (initially based on config)
    let isEnabled = false
    if (key === 'wander_enabled') {
      isEnabled = this.config.ai?.wander?.enabled ?? false
    } else if (key === 'chase_enabled') {
      isEnabled = this.config.ai?.chase?.enabled ?? false
    }
    const checkmark = this.scene.add.text(x, y, '✓', {
      fontSize: '12px',
      color: '#00ff00'
    }).setOrigin(0.5, 0.5).setVisible(isEnabled)
    
    // Store checkbox reference for easy updates
    this.checkboxes.set(key, checkmark)
    
    // Label
    const labelText = this.scene.add.text(x + 25, y, label, {
      fontSize: '11px',
      color: '#ffffff'
    }).setOrigin(0, 0.5)

    // Click handler
    checkboxBg.on('pointerdown', () => {
      // Initialize AI config if it doesn't exist
      if (!this.config.ai) {
        this.config.ai = {}
      }
      
      if (key === 'wander_enabled') {
        if (!this.config.ai.wander) {
          this.config.ai.wander = { enabled: false }
        }
        const currentlyEnabled = this.config.ai.wander.enabled
        this.config.ai.wander.enabled = !currentlyEnabled
        checkmark.setVisible(!currentlyEnabled)
      } else if (key === 'chase_enabled') {
        if (!this.config.ai.chase) {
          this.config.ai.chase = { enabled: false }
        }
        const currentlyEnabled = this.config.ai.chase.enabled
        this.config.ai.chase.enabled = !currentlyEnabled
        checkmark.setVisible(!currentlyEnabled)
      }
    })

    if (section) {
      section.container.add([checkboxBg, checkmark, labelText])
      section.fields.push(key)
    } else {
      this.modal.add([checkboxBg, checkmark, labelText])
    }
  }

  private createAITextField(
    key: string, 
    label: string, 
    x: number, 
    y: number, 
    section?: { container: Phaser.GameObjects.Container, collapsed: boolean, fields: string[] } | null
  ): void {
    // Label
    const labelText = this.scene.add.text(x, y - 10, label, {
      fontSize: '11px',
      color: '#ffffff',
      fixedWidth: 110
    }).setOrigin(0, 0.5)
    if (section) {
      section.container.add(labelText)
    }

    // Input background
    const inputBg = this.scene.add.rectangle(x + 140, y, 120, 20, 0x555555)
    inputBg.setStrokeStyle(1, 0x777777)
    inputBg.setInteractive({ useHandCursor: true })
    
    // Get current value
    let currentValue: string
    if (key === 'wander_radius') {
      currentValue = String(this.config.ai?.wander?.wanderRadius ?? 5)
    } else if (key === 'wander_interval') {
      currentValue = String(this.config.ai?.wander?.wanderInterval ?? 3000)
    } else if (key === 'chase_range') {
      currentValue = String(this.config.ai?.chase?.chaseRange ?? 3)
    } else if (key === 'chase_distance') {
      currentValue = String(this.config.ai?.chase?.chaseDistance ?? 8)
    } else {
      currentValue = '0'
    }

    // Input text
    const inputText = this.scene.add.text(x + 140, y, currentValue, {
      fontSize: '11px',
      color: '#ffffff',
      fixedWidth: 115
    }).setOrigin(0.5, 0.5)
    
    // Click handler for field selection
    inputBg.on('pointerdown', (_pointer: any, _localX: number, _localY: number, event: any) => {
      event.stopPropagation()
      // AI input field clicked
      
      // Sync current field value to config before switching
      if (this.selectedField && this.selectedField !== key) {
        this.syncFieldToConfig(this.selectedField)
      }
      
      this.selectedField = key
      this.updateFieldAppearance()
    })
    
    inputBg.on('pointerover', () => {
      if (this.selectedField !== key) {
        inputBg.setStrokeStyle(2, 0xaaaaaa)
      }
    })
    
    inputBg.on('pointerout', () => {
      if (this.selectedField !== key) {
        inputBg.setStrokeStyle(1, 0x777777)
      }
    })

    if (section) {
      section.container.add([inputBg, inputText])
      section.fields.push(key)
    } else {
      this.modal.add([inputBg, inputText])
    }
    
    this.inputTexts.set(key, inputText)
  }

  private updateInputValues(): void {
    // updateInputValues called
    this.inputTexts.forEach((text, key) => {
      if (key === 'texture') {
        const currentTexture = AVAILABLE_TEXTURES.find(t => t.key === this.config.texture)
        const displayText = currentTexture ? currentTexture.name : this.config.texture
        text.setText(displayText)
        // Updated texture display
      } else if (key.startsWith('wander_')) {
        // Handle AI wander fields
        let displayValue = '0'
        if (key === 'wander_radius') {
          displayValue = String(this.config.ai?.wander?.wanderRadius ?? 5)
        } else if (key === 'wander_interval') {
          displayValue = String(this.config.ai?.wander?.wanderInterval ?? 3000)
        }
        text.setText(displayValue)
        // Updated AI wander field display
      } else if (key.startsWith('chase_')) {
        // Handle AI chase fields
        let displayValue = '0'
        if (key === 'chase_range') {
          displayValue = String(this.config.ai?.chase?.chaseRange ?? 3)
        } else if (key === 'chase_distance') {
          displayValue = String(this.config.ai?.chase?.chaseDistance ?? 8)
        }
        text.setText(displayValue)
        // Updated AI chase field display
      } else if (key.startsWith('attack_')) {
      } else {
        const currentValue = (this.config as any)[key]
        const displayValue = currentValue !== undefined ? String(currentValue) : '0'
        text.setText(displayValue)
        // Updated field display
      }
    })
    
    // Also update checkboxes for AI behaviors and attack types
    this.updateCheckboxStates()
  }

  private updateCheckboxStates(): void {
    // Update attack type checkboxes
    const meleeCheckbox = this.checkboxes.get('attack_melee')
    if (meleeCheckbox) {
      meleeCheckbox.setVisible(this.config.availableAttackTypes?.melee?.enabled ?? false)
    }
    
    const rangedCheckbox = this.checkboxes.get('attack_ranged')
    if (rangedCheckbox) {
      rangedCheckbox.setVisible(this.config.availableAttackTypes?.ranged?.enabled ?? false)
    }
    
    const homingCheckbox = this.checkboxes.get('attack_homing')
    if (homingCheckbox) {
      homingCheckbox.setVisible(this.config.availableAttackTypes?.homing?.enabled ?? false)
    }
    
    // Update AI behavior checkboxes
    const wanderCheckbox = this.checkboxes.get('wander_enabled')
    if (wanderCheckbox) {
      wanderCheckbox.setVisible(this.config.ai?.wander?.enabled ?? false)
    }
    
    const chaseCheckbox = this.checkboxes.get('chase_enabled')
    if (chaseCheckbox) {
      chaseCheckbox.setVisible(this.config.ai?.chase?.enabled ?? false)
    }
    
  }

  private syncFieldToConfig(fieldKey: string): void {
    const textElement = this.inputTexts.get(fieldKey)
    if (!textElement) {
      // No text element found for field
      return
    }
    
    const currentValue = textElement.text.trim()
    // Syncing field to config
    
    // Mark field as modified if it has content
    if (currentValue && currentValue !== '0') {
      this.modifiedFields.add(fieldKey)
      // Field marked as modified
    }
    
    if (fieldKey === 'texture') {
      // Texture is handled by dropdown, don't override
      // Skipping texture field sync
      return
    } else if (fieldKey === 'animation') {
      // Animation is a text field
      (this.config as any)[fieldKey] = currentValue
    } else if (fieldKey.startsWith('wander_')) {
      // Handle AI wander fields
      if (!this.config.ai) {
        this.config.ai = { wander: { enabled: false } }
      }
      if (!this.config.ai.wander) {
        this.config.ai.wander = { enabled: false }
      }
      
      if (fieldKey === 'wander_radius') {
        const numValue = parseInt(currentValue) || 5
        this.config.ai.wander.wanderRadius = numValue
      } else if (fieldKey === 'wander_interval') {
        const numValue = parseInt(currentValue) || 3000
        this.config.ai.wander.wanderInterval = numValue
      }
    } else if (fieldKey.startsWith('chase_')) {
      // Handle AI chase fields
      if (!this.config.ai) {
        this.config.ai = {}
      }
      if (!this.config.ai.chase) {
        this.config.ai.chase = { enabled: false }
      }
      
      if (fieldKey === 'chase_range') {
        const numValue = parseInt(currentValue) || 3
        this.config.ai.chase.chaseRange = numValue
      } else if (fieldKey === 'chase_distance') {
        const numValue = parseInt(currentValue) || 8
        this.config.ai.chase.chaseDistance = numValue
      }
    } else {
      // All other fields are numeric
      if (currentValue === '' || currentValue === '0') {
        (this.config as any)[fieldKey] = 0
      } else {
        const numValue = parseFloat(currentValue)
        if (isNaN(numValue)) {
          // Invalid numeric value, using 0
          ;(this.config as any)[fieldKey] = 0
        } else {
          ;(this.config as any)[fieldKey] = numValue
        }
      }
    }
    
    // Synced field to config
  }

  private updateFieldAppearance(): void {
    // Reset all field borders to default
    this.modal.list.forEach((child: any) => {
      if (child.type === 'Rectangle' && child.fillColor === 0x555555) {
        child.setStrokeStyle(1, 0x777777)
      }
    })
    
    // Highlight selected field
    if (this.selectedField) {
      const fieldIndex = ['health', 'attack', 'defense', 'attackSpeed', 'movementSpeed', 'attackRange', 'goldOnDeath', 'expOnDeath', 'hitboxWidth', 'hitboxHeight', 'hitboxCenterX', 'hitboxCenterY', 'texture', 'animation'].indexOf(this.selectedField)
      if (fieldIndex >= 0) {
        // Find the corresponding input background (rectangles with the specific fill color)
        let rectangleCount = 0
        this.modal.list.forEach((child: any) => {
          if (child.type === 'Rectangle' && child.fillColor === 0x555555) {
            if (rectangleCount === fieldIndex) {
              child.setStrokeStyle(2, 0x00ff00) // Green border for selected field
            }
            rectangleCount++
          }
        })
      }
    }
  }

  private handleKeyDown(event: KeyboardEvent): void {
    // handleKeyDown called
    
    if (!this.selectedField) {
      // No field selected for keyboard input
      return
    }

    // Prevent duplicate key events (debounce)
    const currentTime = Date.now()
    if (event.key === this.lastKey && currentTime - this.lastKeyTime < 50) {
      // Duplicate key event ignored
      return
    }
    this.lastKeyTime = currentTime
    this.lastKey = event.key

    // Processing keyboard input
    
    // Debug: log current config state
    // Current config state

    const currentText = this.inputTexts.get(this.selectedField)!
    if (!currentText) {
      console.error(`❌ No text element found for field '${this.selectedField}'`)
      return
    }
    
    let currentValue = currentText.text
    // Current text value

    if (event.key === 'Backspace') {
      currentValue = currentValue.slice(0, -1)
      // Backspace pressed
    } else if (event.key === 'Enter') {
      // Enter pressed - deselecting field
      this.selectedField = null
      this.updateFieldAppearance()
      return
    } else if (event.key.length === 1) {
      // Only allow valid characters
      if (this.selectedField === 'texture' || this.selectedField === 'animation') {
        // For text fields, allow letters
        if (/[a-zA-Z_]/.test(event.key)) {
          currentValue += event.key
          // Text character added
        } else {
          // Invalid character for text field
        }
      } else if (this.selectedField?.startsWith('wander_') || this.selectedField?.startsWith('chase_')) {
        // For AI fields, allow integers only (no decimals)
        if (/[0-9]/.test(event.key)) {
          currentValue += event.key
          // AI numeric character added
        } else {
          // Invalid character for AI field
        }
      } else {
        // For numeric fields, allow numbers and decimal
        if (/[0-9.]/.test(event.key)) {
          currentValue += event.key
          // Numeric character added
        } else {
          // Invalid character for numeric field
        }
      }
    }

    currentText.setText(currentValue)
    
    // Mark field as modified by user
    this.modifiedFields.add(this.selectedField)
    // Field marked as modified
    
    // Update config
    if (this.selectedField === 'texture' || this.selectedField === 'animation') {
      (this.config as any)[this.selectedField] = currentValue
      // Updated text config
    } else if (this.selectedField?.startsWith('wander_')) {
      // Handle AI wander fields
      if (!this.config.ai) {
        this.config.ai = { wander: { enabled: false } }
      }
      if (!this.config.ai.wander) {
        this.config.ai.wander = { enabled: false }
      }
      
      const numValue = parseInt(currentValue) || 0
      if (this.selectedField === 'wander_radius') {
        this.config.ai.wander.wanderRadius = numValue
        // Updated wander radius
      } else if (this.selectedField === 'wander_interval') {
        this.config.ai.wander.wanderInterval = numValue
        // Updated wander interval
      }
    } else if (this.selectedField?.startsWith('chase_')) {
      // Handle AI chase fields
      if (!this.config.ai) {
        this.config.ai = {}
      }
      if (!this.config.ai.chase) {
        this.config.ai.chase = { enabled: false }
      }
      
      const numValue = parseInt(currentValue) || 0
      if (this.selectedField === 'chase_range') {
        this.config.ai.chase.chaseRange = numValue
        // Updated chase range
      } else if (this.selectedField === 'chase_distance') {
        this.config.ai.chase.chaseDistance = numValue
        // Updated chase distance
      }
    } else {
      const numValue = parseFloat(currentValue) || 0;
      (this.config as any)[this.selectedField] = numValue
      // Updated numeric config
      
      // Special logging for the problematic fields
      if (this.selectedField === 'goldOnDeath' || this.selectedField === 'expOnDeath') {
        // Special field updated
      }
    }
  }

  private handleConfirm(): void {
    // Sync current selected field before confirming
    if (this.selectedField) {
      this.syncFieldToConfig(this.selectedField)
    }
    
    // Collect all field values at confirmation time (as backup)
    this.inputTexts.forEach((textElement, fieldKey) => {
      if (fieldKey === 'texture') {
        // Texture is handled by dropdown, config should already be correct
        return
      } else if (fieldKey === 'animation') {
        // Animation is a text field
        (this.config as any)[fieldKey] = textElement.text
      } else {
        // All other fields are numeric
        const numValue = parseFloat(textElement.text) || 0
        ;(this.config as any)[fieldKey] = numValue
      }
      // Final config collected
    })
    
    // handleConfirm called with final config
    console.log(`🔧 UnitConfigModal: Confirming with final config:`, this.config)
    console.log(`🔧 UnitConfigModal: Final AI config being passed:`, this.config.ai)
    this.hide()
    this.onConfirm(this.config)
  }

  private handleCancel(): void {
    // handleCancel called
    this.hide()
    this.onCancel()
  }

  public reset(): void {
    // Reset to fresh state for new unit placement
    this.freshReset = true
    this.modifiedFields.clear()
    this.checkboxes.clear()
    // Modal reset to fresh state
  }
  
  public updateSceneReferences(scene: Phaser.Scene, uiCamera: Phaser.Cameras.Scene2D.Camera): void {
    // Updating modal scene references
    
    // Remove old keyboard listeners
    if (this.scene.input.keyboard) {
      this.scene.input.keyboard.off('keydown', this.handleKeyDown, this)
      // Removed keyboard listener from old scene
    }
    
    // Update references
    this.scene = scene
    this.uiCamera = uiCamera
    
    // Scene references updated successfully
  }
  
  public static destroyInstance(): void {
    if (UnitConfigModal.instance) {
      UnitConfigModal.instance.destroy()
    }
  }

  public destroy(): void {
    // Destroying UnitConfigModal singleton
    
    // Hide the modal first
    if (this.visible) {
      this.hide()
    }
    
    // Destroy game objects
    if (this.modal) {
      this.modal.destroy()
    }
    if (this.overlay) {
      this.overlay.destroy()
    }
    
    // Clean up dropdown if it exists
    this.hideTextureDropdown()
    
    // Clear collections
    this.inputTexts.clear()
    this.sections.clear()
    this.checkboxes.clear()
    
    // Clean up keyboard listener
    if (this.scene.input.keyboard) {
      this.scene.input.keyboard.off('keydown', this.handleKeyDown, this)
    }
    
    // Clear singleton instance
    UnitConfigModal.instance = null
    UnitConfigModal.sceneKey = null
    
    // UnitConfigModal singleton destroyed
  }
}
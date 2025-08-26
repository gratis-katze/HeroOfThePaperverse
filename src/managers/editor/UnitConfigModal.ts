import Phaser from 'phaser'
import { UnitConfig, DEFAULT_UNIT_CONFIG, AVAILABLE_TEXTURES, TextureOption, AttackType } from '../../units/UnitConfig'

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
    
    console.log('🎭 UnitConfigModal instance created for scene:', scene.scene.key)
    
    // Default callbacks
    this.onConfirm = () => {}
    this.onCancel = () => {}
    
    this.createModal()
  }
  
  public static getInstance(scene: Phaser.Scene, uiCamera: Phaser.Cameras.Scene2D.Camera): UnitConfigModal {
    const currentSceneKey = scene.scene.key
    
    console.log(`🎭 getInstance called for scene '${currentSceneKey}'`)
    console.log(`🎭 Current singleton state: instance=${!!UnitConfigModal.instance}, sceneKey=${UnitConfigModal.sceneKey}`)
    
    // Check if we need to update scene references for existing instance
    if (UnitConfigModal.instance && 
        (UnitConfigModal.sceneKey !== currentSceneKey || 
         UnitConfigModal.instance.scene !== scene ||
         UnitConfigModal.instance.scene.scene.key !== currentSceneKey)) {
      console.log(`🎭 Updating existing UnitConfigModal from scene '${UnitConfigModal.sceneKey}' for new scene '${currentSceneKey}'`)
      UnitConfigModal.instance.updateSceneReferences(scene, uiCamera)
      UnitConfigModal.sceneKey = currentSceneKey
      console.log(`🎭 Scene references updated successfully`)
    }
    
    // Create new instance if none exists
    if (!UnitConfigModal.instance) {
      console.log(`🎭 Creating new UnitConfigModal singleton for scene '${currentSceneKey}'`)
      UnitConfigModal.instance = new UnitConfigModal(scene, uiCamera)
      UnitConfigModal.sceneKey = currentSceneKey
      console.log(`🎭 New singleton created successfully`)
    } else {
      console.log(`🎭 Using existing UnitConfigModal singleton for scene '${currentSceneKey}'`)
    }
    
    return UnitConfigModal.instance
  }

  public show(onConfirm: (config: UnitConfig) => void, onCancel: () => void, prefillConfig?: UnitConfig): void {
    console.log('🎭 UnitConfigModal.show() called - checking modal state')
    console.log('🎭 Scene key:', this.scene.scene.key)
    console.log('🎭 Modal exists:', !!this.modal)
    console.log('🎭 Overlay exists:', !!this.overlay)
    
    // Check if this is a fresh reset before modifying the flag
    const wasFreshReset = this.freshReset
    
    // Use prefilled config if provided, otherwise use default logic
    if (prefillConfig) {
      this.config = { 
        ...prefillConfig,
        hitboxWidth: prefillConfig.hitboxWidth || 1,
        hitboxHeight: prefillConfig.hitboxHeight || 1,
        hitboxCenterX: prefillConfig.hitboxCenterX || 0,
        hitboxCenterY: prefillConfig.hitboxCenterY || 0
      }
      this.modifiedFields.clear() // Clear modified fields when pre-filling
      console.log('✏️ Initialized with prefilled config:', this.config)
    } else if (!this.config || Object.keys(this.config).length === 0 || this.freshReset) {
      this.config = { 
        ...DEFAULT_UNIT_CONFIG,
        hitboxWidth: DEFAULT_UNIT_CONFIG.hitboxWidth || 1,
        hitboxHeight: DEFAULT_UNIT_CONFIG.hitboxHeight || 1,
        hitboxCenterX: DEFAULT_UNIT_CONFIG.hitboxCenterX || 0,
        hitboxCenterY: DEFAULT_UNIT_CONFIG.hitboxCenterY || 0
      }
      this.freshReset = false
      console.log('🔄 Initialized fresh config:', this.config)
    } else {
      console.log('🔄 Preserving existing config:', this.config)
    }
    
    this.onConfirm = onConfirm
    this.onCancel = onCancel
    
    // Don't clear modified fields unless it was a fresh reset
    if (!wasFreshReset) {
      console.log('🔄 Preserving modified fields:', Array.from(this.modifiedFields))
    } else {
      console.log('🔄 Fresh reset - modified fields cleared')
    }
    
    this.updateInputValues()
    
    // Add extra checks for modal visibility
    if (this.modal) {
      this.modal.setVisible(true)
      console.log('🎭 Modal visibility set to true')
    } else {
      console.error('🎭 ERROR: Modal container is null!')
    }
    
    if (this.overlay) {
      this.overlay.setVisible(true)
      console.log('🎭 Overlay visibility set to true')
    } else {
      console.error('🎭 ERROR: Overlay is null!')
    }
    
    this.visible = true
    
    console.log('🎭 UnitConfigModal shown with initial config:', this.config)
    
    // Remove any existing keyboard listener first to prevent duplicates
    console.log('🎮 Setting up keyboard input...')
    console.log('🎮 Scene keyboard available:', !!this.scene.input.keyboard)
    if (this.scene.input.keyboard) {
      this.scene.input.keyboard.off('keydown', this.handleKeyDown, this)
      console.log('🎮 Previous keyboard listener removed')
      // Then add the new listener
      this.scene.input.keyboard.on('keydown', this.handleKeyDown, this)
      console.log('🎮 New keyboard listener registered successfully')
      console.log('🎮 Keyboard enabled:', this.scene.input.keyboard.enabled)
      console.log('🎮 Keyboard manager active:', this.scene.input.keyboard.manager)
    } else {
      console.warn('⚠️ No keyboard input available')
    }
  }

  public hide(): void {
    console.log('🎭 Hiding modal')
    
    // Sync current selected field before hiding
    if (this.selectedField) {
      this.syncFieldToConfig(this.selectedField)
      console.log('🔄 Synced selected field before hiding')
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
      console.log('🎮 Keyboard listener removed')
    }
    console.log('🎭 Modal hidden successfully')
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
    console.log('🎭 Modal overlay assigned to UI camera only')
    this.overlay.on('pointerdown', () => {
      console.log('🎭 Overlay clicked - closing any open dropdowns')
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
    console.log('🎭 Modal container assigned to UI camera only')

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

    // Create sections
    let currentY = -240
    currentY = this.createSection('basicStats', 'Basic Stats', currentY, [
      () => this.createTextField('health', 'Health'),
      () => this.createTextField('attack', 'Attack'),
      () => this.createTextField('defense', 'Defense'),
      () => this.createTextField('attackSpeed', 'Attack Speed'),
      () => this.createTextField('movementSpeed', 'Movement Speed'),
      () => this.createTextField('attackRange', 'Attack Range')
    ])
    
    currentY = this.createSection('rewards', 'Rewards', currentY + 20, [
      () => this.createTextField('goldOnDeath', 'Gold on Death'),
      () => this.createTextField('expOnDeath', 'Exp on Death')
    ])
    
    currentY = this.createSection('hitbox', 'Hitbox Configuration', currentY + 20, [
      () => this.createTextField('hitboxWidth', 'Hitbox Width'),
      () => this.createTextField('hitboxHeight', 'Hitbox Height'),
      () => this.createTextField('hitboxCenterX', 'Hitbox Center X'),
      () => this.createTextField('hitboxCenterY', 'Hitbox Center Y')
    ])
    
    currentY = this.createSection('appearance', 'Appearance', currentY + 20, [
      () => this.createDropdownField('texture', 'Texture'),
      () => this.createTextField('animation', 'Animation')
    ])
    
    currentY = this.createSection('combat', 'Combat System', currentY + 20, [
      () => this.createAttackTypeFields()
    ])

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
      console.log('🎯 Confirm button container clicked')
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
      console.log('🎯 Cancel button container clicked')
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

  private createSection(sectionId: string, title: string, startY: number, fieldFactories: (() => void)[]): number {
    // Section header container - center it properly
    const sectionContainer = this.scene.add.container(0, startY)
    this.modal.add(sectionContainer)

    // Section header background
    const headerBg = this.scene.add.rectangle(0, 0, 450, 25, 0x444444)
    headerBg.setStrokeStyle(1, 0x666666)
    headerBg.setInteractive({ useHandCursor: true })
    sectionContainer.add(headerBg)

    // Expand/collapse arrow - position relative to center
    const arrow = this.scene.add.text(-210, 0, '▼', {
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

    // Content container for fields
    const contentContainer = this.scene.add.container(0, 0)
    sectionContainer.add(contentContainer)

    // Store section info
    const sectionInfo = {
      container: contentContainer,
      collapsed: false,
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

    // Calculate final height based on field count
    const finalHeight = 30 + (fieldFactories.length * 40)
    
    // Return next Y position
    return startY + (sectionInfo.collapsed ? 25 : finalHeight)
  }

  private toggleSection(sectionId: string, arrow: Phaser.GameObjects.Text): void {
    const section = this.sections.get(sectionId)
    if (!section) return

    section.collapsed = !section.collapsed
    section.container.setVisible(!section.collapsed)
    arrow.setText(section.collapsed ? '▶' : '▼')
    
    console.log(`🔽 Section '${sectionId}' ${section.collapsed ? 'collapsed' : 'expanded'}`)
    
    // Reposition all sections below this one
    this.repositionSections()
  }

  private repositionSections(): void {
    let currentY = -240
    const sectionOrder = ['basicStats', 'rewards', 'hitbox', 'appearance', 'combat']
    
    sectionOrder.forEach(sectionId => {
      const section = this.sections.get(sectionId)
      if (section) {
        // Find the parent container (section container)
        const sectionContainer = section.container.parentContainer
        if (sectionContainer) {
          sectionContainer.y = currentY
          const fieldCount = section.fields.length
          const sectionHeight = section.collapsed ? 25 : (25 + fieldCount * 40)
          currentY += sectionHeight + 20
        }
      }
    })
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
      console.log(`🎯 Input field '${key}' clicked`)
      console.log(`🎯 Input field interactive:`, inputBg.input?.enabled)
      console.log(`🔍 Current selectedField: '${this.selectedField}'`)
      console.log(`🔍 Current config before sync:`, JSON.stringify(this.config, null, 2))
      
      // Sync current field value to config before switching
      if (this.selectedField && this.selectedField !== key) {
        console.log(`🔄 About to sync field '${this.selectedField}' before switching to '${key}'`)
        this.syncFieldToConfig(this.selectedField)
        console.log(`🔍 Config after sync:`, JSON.stringify(this.config, null, 2))
      }
      
      this.selectedField = key
      console.log(`🎯 Selected field changed to: '${key}'`)
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
    return 30 + (this.currentFieldIndex * 40)
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
      console.log(`🎯 Dropdown field '${key}' clicked`)
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
          console.log(`🎯 Selected texture: ${textureOption.name} (${textureOption.key})`)
          
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
    console.log(`🔄 selectTexture called with:`, textureOption)
    
    // Update config
    this.config.texture = textureOption.key
    this.config.animationPrefix = textureOption.animationPrefix
    console.log(`🔄 Config updated:`, { texture: this.config.texture, animationPrefix: this.config.animationPrefix })
    
    // Update display text
    const textureText = this.inputTexts.get('texture')
    console.log(`🔄 textureText element found:`, !!textureText)
    if (textureText) {
      const oldText = textureText.text
      textureText.setText(textureOption.name)
      console.log(`🔄 Text updated from "${oldText}" to "${textureText.text}"`)
    }
    
    console.log(`✅ Updated texture to: ${textureOption.name} with animation prefix: ${textureOption.animationPrefix}`)
  }

  private createAttackTypeFields(): void {
    const x = 20
    let y = this.getCurrentFieldY()
    
    // Find the current section being populated
    const currentSection = this.getCurrentSection()
    
    // Section title
    const sectionTitle = this.scene.add.text(x, y - 10, 'Available Attack Types:', {
      fontSize: '14px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0, 0.5)
    if (currentSection) {
      currentSection.container.add(sectionTitle)
    }

    // Create checkboxes for each attack type
    const attackTypes = [AttackType.MELEE, AttackType.RANGED, AttackType.HOMING]
    attackTypes.forEach((attackType, index) => {
      const checkboxY = y + 20 + (index * 25)
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
      
      console.log(`🎯 Attack type ${attackType} ${!currentlyEnabled ? 'enabled' : 'disabled'}`)
    })

    if (section) {
      section.container.add([checkboxBg, checkmark, label])
    } else {
      this.modal.add([checkboxBg, checkmark, label])
    }
  }



  private updateInputValues(): void {
    console.log('🔄🚨 updateInputValues called with config:', this.config)
    console.log('🔄🚨 Modified fields:', Array.from(this.modifiedFields))
    this.inputTexts.forEach((text, key) => {
      const oldValue = text.text
      if (key === 'texture') {
        const currentTexture = AVAILABLE_TEXTURES.find(t => t.key === this.config.texture)
        const displayText = currentTexture ? currentTexture.name : this.config.texture
        text.setText(displayText)
        console.log(`🔄 Updated ${key} display: "${oldValue}" -> "${displayText}"`)
      } else {
        const currentValue = (this.config as any)[key]
        const displayValue = currentValue !== undefined ? String(currentValue) : '0'
        text.setText(displayValue)
        console.log(`🔄 Updated ${key} display: "${oldValue}" -> "${displayValue}" (config value: ${currentValue})`)
      }
    })
  }

  private syncFieldToConfig(fieldKey: string): void {
    const textElement = this.inputTexts.get(fieldKey)
    if (!textElement) {
      console.log(`⚠️ No text element found for field '${fieldKey}'`)
      return
    }
    
    const currentValue = textElement.text.trim()
    console.log(`🔄 Syncing field '${fieldKey}' with value '${currentValue}' to config`)
    
    // Mark field as modified if it has content
    if (currentValue && currentValue !== '0') {
      this.modifiedFields.add(fieldKey)
      console.log(`🔄 Field '${fieldKey}' marked as modified during sync`)
    }
    
    if (fieldKey === 'texture') {
      // Texture is handled by dropdown, don't override
      console.log(`🔄 Skipping texture field sync (handled by dropdown)`)
      return
    } else if (fieldKey === 'animation') {
      // Animation is a text field
      (this.config as any)[fieldKey] = currentValue
    } else {
      // All other fields are numeric
      if (currentValue === '' || currentValue === '0') {
        (this.config as any)[fieldKey] = 0
      } else {
        const numValue = parseFloat(currentValue)
        if (isNaN(numValue)) {
          console.log(`⚠️ Invalid numeric value '${currentValue}' for field '${fieldKey}', using 0`)
          ;(this.config as any)[fieldKey] = 0
        } else {
          ;(this.config as any)[fieldKey] = numValue
        }
      }
    }
    
    console.log(`✅ Synced config.${fieldKey} = ${(this.config as any)[fieldKey]}`)
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
    console.log(`🎮 handleKeyDown called - key: '${event.key}'`)
    console.log(`🎮 Current selectedField: '${this.selectedField}'`)
    console.log(`🎮 Modal visible: ${this.visible}`)
    
    if (!this.selectedField) {
      console.log('🎮 No field selected for keyboard input')
      return
    }

    // Prevent duplicate key events (debounce)
    const currentTime = Date.now()
    if (event.key === this.lastKey && currentTime - this.lastKeyTime < 50) {
      console.log('🎮 Duplicate key event ignored:', event.key)
      return
    }
    this.lastKeyTime = currentTime
    this.lastKey = event.key

    console.log(`🎮 Processing key: '${event.key}' for field '${this.selectedField}'`)
    
    // Debug: log current config state
    console.log(`🔍 Current config for ${this.selectedField}:`, (this.config as any)[this.selectedField])

    const currentText = this.inputTexts.get(this.selectedField)!
    if (!currentText) {
      console.error(`❌ No text element found for field '${this.selectedField}'`)
      return
    }
    
    let currentValue = currentText.text
    console.log(`🔍 Current text value: '${currentValue}'`)

    if (event.key === 'Backspace') {
      currentValue = currentValue.slice(0, -1)
      console.log(`🎮 Backspace - new value: '${currentValue}'`)
    } else if (event.key === 'Enter') {
      console.log(`🎮 Enter pressed - deselecting field '${this.selectedField}'`)
      this.selectedField = null
      this.updateFieldAppearance()
      return
    } else if (event.key.length === 1) {
      // Only allow valid characters
      if (this.selectedField === 'texture' || this.selectedField === 'animation') {
        // For text fields, allow letters
        if (/[a-zA-Z_]/.test(event.key)) {
          currentValue += event.key
          console.log(`🎮 Text field - added '${event.key}', new value: '${currentValue}'`)
        } else {
          console.log(`🎮 Invalid character '${event.key}' for text field`)
        }
      } else {
        // For numeric fields, allow numbers and decimal
        if (/[0-9.]/.test(event.key)) {
          currentValue += event.key
          console.log(`🎮 Numeric field - added '${event.key}', new value: '${currentValue}'`)
        } else {
          console.log(`🎮 Invalid character '${event.key}' for numeric field`)
        }
      }
    }

    currentText.setText(currentValue)
    
    // Mark field as modified by user
    this.modifiedFields.add(this.selectedField)
    console.log(`🎮 Field '${this.selectedField}' marked as modified. Modified fields:`, Array.from(this.modifiedFields))
    
    // Update config
    if (this.selectedField === 'texture' || this.selectedField === 'animation') {
      (this.config as any)[this.selectedField] = currentValue
      console.log(`🎮 Updated config.${this.selectedField} = '${currentValue}'`)
    } else {
      const numValue = parseFloat(currentValue) || 0;
      (this.config as any)[this.selectedField] = numValue
      console.log(`🎮 Updated config.${this.selectedField} = ${numValue}`)
      
      // Special logging for the problematic fields
      if (this.selectedField === 'goldOnDeath' || this.selectedField === 'expOnDeath') {
        console.log(`🔍 Special check for ${this.selectedField}:`, {
          originalValue: currentValue,
          parsedValue: numValue,
          configValue: (this.config as any)[this.selectedField]
        })
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
      console.log(`🔄 Final collected config.${fieldKey} = ${(this.config as any)[fieldKey]}`)
    })
    
    console.log('✅ handleConfirm called with final config:', this.config)
    console.log('✅ onConfirm callback:', typeof this.onConfirm)
    this.hide()
    console.log('✅ Modal hidden, calling onConfirm callback')
    this.onConfirm(this.config)
    console.log('✅ onConfirm callback completed')
  }

  private handleCancel(): void {
    console.log('❌ handleCancel called')
    console.log('❌ onCancel callback:', typeof this.onCancel)
    this.hide()
    console.log('❌ Modal hidden, calling onCancel callback')
    this.onCancel()
    console.log('❌ onCancel callback completed')
  }

  public reset(): void {
    // Reset to fresh state for new unit placement
    this.freshReset = true
    this.modifiedFields.clear()
    console.log('🔄 Modal reset to fresh state - will reinitialize on next show()')
  }
  
  public updateSceneReferences(scene: Phaser.Scene, uiCamera: Phaser.Cameras.Scene2D.Camera): void {
    console.log('🔄 Updating modal scene references')
    console.log('🔄 Old scene:', this.scene.scene.key)
    console.log('🔄 New scene:', scene.scene.key)
    
    // Remove old keyboard listeners
    if (this.scene.input.keyboard) {
      this.scene.input.keyboard.off('keydown', this.handleKeyDown, this)
      console.log('🔄 Removed keyboard listener from old scene')
    }
    
    // Update references
    this.scene = scene
    this.uiCamera = uiCamera
    
    console.log('🔄 Scene references updated successfully')
  }
  
  public static destroyInstance(): void {
    if (UnitConfigModal.instance) {
      UnitConfigModal.instance.destroy()
    }
  }

  public destroy(): void {
    console.log('🎭 Destroying UnitConfigModal singleton')
    
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
    
    // Clean up keyboard listener
    if (this.scene.input.keyboard) {
      this.scene.input.keyboard.off('keydown', this.handleKeyDown, this)
    }
    
    // Clear singleton instance
    UnitConfigModal.instance = null
    UnitConfigModal.sceneKey = null
    
    console.log('🎭 UnitConfigModal singleton destroyed')
  }
}
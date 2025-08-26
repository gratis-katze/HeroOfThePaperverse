import Phaser from 'phaser'

export interface CategoryItem {
  label: string
  action: () => void
}

export class EditorUIManager {
  private scene: Phaser.Scene
  private uiCamera: Phaser.Cameras.Scene2D.Camera
  private navBar!: Phaser.GameObjects.Container
  private statusText!: Phaser.GameObjects.Text
  private categoryButtons: Map<string, {bg: Phaser.GameObjects.Rectangle, label: Phaser.GameObjects.Text}> = new Map()
  private subCategoryContainer!: Phaser.GameObjects.Container
  private activeCategory: string = 'terrain'
  private readonly navBarHeight: number = 80

  constructor(scene: Phaser.Scene, uiCamera: Phaser.Cameras.Scene2D.Camera) {
    this.scene = scene
    this.uiCamera = uiCamera
    this.createUI()
  }

  private createUI(): void {
    this.createNavBar()
    this.createStatusBar()
  }

  private createNavBar(): void {
    // Create navigation bar container
    this.navBar = this.scene.add.container(0, 0)
    this.navBar.setDepth(1000)

    // Nav bar background
    const screenWidth = this.scene.cameras.main.width
    const navBg = this.scene.add.rectangle(screenWidth / 2, this.navBarHeight / 2, screenWidth, this.navBarHeight, 0x2a2a2a, 0.95)
    navBg.setDepth(999)

    // Make only the UI camera render these elements
    this.scene.cameras.main.ignore([this.navBar, navBg])
    this.uiCamera.ignore([]) // UI camera renders everything except what we tell it to ignore

    // Create categorized navigation system
    this.createCategorizedNav()
  }

  private createCategorizedNav(): void {
    const categorySpacing = 90
    const startX = 80
    const categoryY = 25

    // Create category buttons (Tools, Terrain, Blocks, Units, Map)
    const categories = [
      { key: 'tools', label: 'Tools' },
      { key: 'terrain', label: 'Terrain' },
      { key: 'blocks', label: 'Blocks' },
      { key: 'units', label: 'Units' },
      { key: 'map', label: 'Map' }
    ]

    // Create category buttons
    let currentX = startX
    categories.forEach(category => {
      const isActive = this.activeCategory === category.key
      const button = this.createFixedNavButton(currentX, categoryY, category.label, 
        () => this.setActiveCategory(category.key), isActive)
      
      this.categoryButtons.set(category.key, button)
      currentX += categorySpacing
    })

    // Create sub-category container
    this.subCategoryContainer = this.scene.add.container(0, 0)
    this.subCategoryContainer.setDepth(1001)
    
    // Make only the UI camera render the sub-category container
    this.scene.cameras.main.ignore(this.subCategoryContainer)

    // Initialize with terrain category
    this.updateSubCategories()
  }

  public setActiveCategory(categoryKey: string): void {
    this.activeCategory = categoryKey
    this.updateCategoryButtons()
    this.updateSubCategories()
    // Active category updated
  }

  private updateCategoryButtons(): void {
    this.categoryButtons.forEach((button, key) => {
      const isActive = key === this.activeCategory
      button.bg.setFillStyle(isActive ? 0x4a9eff : 0x404040)
      button.label.setStyle({ 
        color: isActive ? '#ffffff' : '#cccccc',
        fontStyle: isActive ? 'bold' : 'normal'
      })
    })
  }

  public updateSubCategories(): void {
    // Clear existing sub-category buttons
    this.subCategoryContainer.removeAll(true)

    const subCategoryY = 55
    const buttonSpacing = 70
    let startX = 80

    // Get items for active category
    const categoryItems = this.getCategoryItems(this.activeCategory)
    
    categoryItems.forEach((item, index) => {
      const isActive = this.isItemActive(item, this.activeCategory)
      const button = this.createFixedNavButton(startX + (index * buttonSpacing), subCategoryY, 
        item.label, item.action, isActive)
      
      this.subCategoryContainer.add([button.bg, button.label])
    })
  }

  public getCategoryItems(_categoryKey: string): Array<CategoryItem> {
    // This will be overridden by callbacks from the main scene
    return []
  }

  public isItemActive(_item: CategoryItem, _categoryKey: string): boolean {
    // This will be overridden by callbacks from the main scene
    return false
  }

  private createStatusBar(): void {
    // Status text at bottom of screen
    this.statusText = this.scene.add.text(10, this.scene.cameras.main.height - 30, '', {
      fontSize: '12px',
      color: '#ffffff',
      backgroundColor: '#000000',
      padding: { x: 8, y: 4 }
    }).setDepth(1000)
    
    // Make only the UI camera render the status text
    this.scene.cameras.main.ignore(this.statusText)
  }

  private createFixedNavButton(x: number, y: number, text: string, onClick: () => void, isActive: boolean = false) {
    const bg = this.scene.add.rectangle(x, y, 70, 25, isActive ? 0x4a9eff : 0x404040)
    bg.setDepth(1001)
    bg.setInteractive({ useHandCursor: true })
    
    const label = this.scene.add.text(x, y, text, { 
      fontSize: '10px', 
      color: isActive ? '#ffffff' : '#cccccc',
      fontStyle: isActive ? 'bold' : 'normal'
    })
    label.setOrigin(0.5, 0.5)
    label.setDepth(1002)
    
    // Make only the UI camera render these button elements
    this.scene.cameras.main.ignore([bg, label])
    
    bg.on('pointerover', () => {
      if (!isActive) bg.setFillStyle(0x555555)
      label.setStyle({ color: '#ffffff' })
    })
    bg.on('pointerout', () => {
      bg.setFillStyle(isActive ? 0x4a9eff : 0x404040)
      label.setStyle({ color: isActive ? '#ffffff' : '#cccccc' })
    })
    bg.on('pointerdown', () => {
      // Nav button clicked
      onClick()
    })
    
    return { bg, label }
  }

  public updateStatusText(text: string): void {
    if (this.statusText) {
      this.statusText.setText(text)
    }
  }

  public refreshNavBar(): void {
    // Update category and sub-category buttons to reflect current state
    this.updateCategoryButtons()
    this.updateSubCategories()
  }

  public getNavBarHeight(): number {
    return this.navBarHeight
  }

  public getActiveCategory(): string {
    return this.activeCategory
  }

  public destroy(): void {
    if (this.navBar) this.navBar.destroy()
    if (this.statusText) this.statusText.destroy()
    if (this.subCategoryContainer) this.subCategoryContainer.destroy()
    this.categoryButtons.clear()
  }
}